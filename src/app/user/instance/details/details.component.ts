import {Component, Input, OnInit, Output} from '@angular/core';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {Instance} from '@core';
import {Subject} from 'rxjs';

@Component({
    selector: 'visa-instance-details',
    styleUrls: ['./details.component.scss'],
    templateUrl: './details.component.html',
})
export class DetailsComponent implements OnInit {

    @Input()
    public instance: Instance;

    public form: UntypedFormGroup;

    // tslint:disable-next-line:no-output-native
    @Output()
    public close: Subject<null> = new Subject();

    @Output()
    public update: Subject<any> = new Subject();

    public ngOnInit(): void {
        this.createForm();
        // Disable the form if the user is not the owner
        if (this.instance.membership.role !== 'OWNER') {
            this.form.disable();
        }
    }

    public handleUpdate(): void {
        this.update.next(this.form.value);
    }

    private createForm(): void {
        this.form = new UntypedFormGroup({
            name: new UntypedFormControl(this.instance.name, Validators.compose([
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(100)])),
            comments: new UntypedFormControl(this.instance.comments, Validators.maxLength(4000)),
        });
    }

}
