import {Injectable} from '@angular/core';
import {ConfigService} from './config.service';
import {CookieService} from 'ngx-cookie-service';
import {OAuthEvent, OAuthService, OAuthSuccessEvent} from 'angular-oauth2-oidc';
import {JwksValidationHandler} from 'angular-oauth2-oidc-jwks';
import {filter} from 'rxjs/operators';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {ApplicationState} from '../state';
import {AccountActions} from '../actions';

@Injectable({
    providedIn: 'root',
})
export class AuthenticationService {

    constructor(private _oauthService: OAuthService,
                private _configService: ConfigService,
                private _cookieService: CookieService,
                private _store: Store<ApplicationState>,
                private _router: Router) {

        this._oauthService.events
            .pipe(filter(event => event.type === 'logout'))
            .subscribe(async (event: OAuthEvent) => {
                const currentUrl = this._router.url;
                const redirectUrl = `/login?returnUrl=${currentUrl}`;
                this._router.navigateByUrl(redirectUrl).then(() => {
                    this._store.dispatch(AccountActions.clearAccount());
                    this._removeCookie();
                });
            });

        this._oauthService.events
            .pipe(filter(event => event.type === 'token_received'))
            .subscribe((event: OAuthEvent) => {
                if (event instanceof OAuthSuccessEvent) {
                    this._redirectToPreviousUrl();
                    this._updateCookie();
                }
            });
    }

    private _updateCookie(): void {
        const {hostname} = window.location;
        const accessToken = this._oauthService.getAccessToken();
        const accessTokenExpiration = new Date(this._oauthService.getAccessTokenExpiration());
        const isHttps = this._isHttps();
        this._cookieService.set('access_token', accessToken, accessTokenExpiration, '/', hostname, isHttps, 'Strict');
    }

    private _removeCookie(): void {
        this._cookieService.delete('access_token');
    }

    private _isHttps(): boolean {
        return document.location.protocol === 'https:';
    }

    private _redirectToPreviousUrl(): void {
        const state = this._oauthService.state;
        if (state) {
            const redirectUrl = decodeURIComponent(state);
            if (redirectUrl) {
                this._router.navigateByUrl(redirectUrl).then(r => {
                    this._oauthService.state = null;
                });
            }
        }
    }

    public init(): () => Promise<any> {
        return (): Promise<any> => {
            return new Promise(async (resolve, reject) => {
                const config = await this._configService.load();
                const {issuer, clientId, scope, showDebugInformation, sessionChecksEnabled} = config.login;
                const redirectUri = `${window.location.origin}/home`;
                const postLogoutRedirectUri = `${window.location.origin}/login`;
                const authConfig = {
                    issuer,
                    clientId,
                    scope,
                    showDebugInformation,
                    redirectUri,
                    postLogoutRedirectUri,
                    sessionChecksEnabled,
                    responseType: 'code'
                };

                this._oauthService.configure(authConfig);
                this._oauthService.setStorage(localStorage);
                this._oauthService.tokenValidationHandler = new JwksValidationHandler();

                this._oauthService.loadDiscoveryDocumentAndTryLogin().then(isLoggedIn => {
                    if (isLoggedIn) {
                        this._updateCookie();
                        this._oauthService.setupAutomaticSilentRefresh();
                        resolve(null);
                    }
                });
            });
        };
    }

    public login(url): Promise<void> {
        return this._oauthService.loadDiscoveryDocument().then(() => {
            this._oauthService.tryLogin().then(_ => {
                this._oauthService.initCodeFlow(url);
            });
        });
    }

    public logout(): void {
        this._oauthService.logOut();
    }

    public isLoggedIn(): boolean {
        const isTokenExpired = this._oauthService.getAccessTokenExpiration() <= new Date().getTime();
        return this._oauthService.getAccessToken() != null && !isTokenExpired;
    }

}
