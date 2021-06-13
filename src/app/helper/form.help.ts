import { FormArray, FormControl, FormGroup } from '@angular/forms';

export class FormHelper {
    public static validateAllFormFields = (formGroup: FormGroup) => {
        Object.keys(formGroup.controls).forEach(field => {
            const control = formGroup.get(field);
            if (control instanceof FormControl || control instanceof FormArray) {
                // control.markAsTouched({ onlySelf: true });
                control.markAsDirty();
            } else if (control instanceof FormGroup) {
              FormHelper.validateAllFormFields(control);
            }
        });
    }

    public static noWhitespaceValidator(control: FormControl): any {
        const isWhitespace = (control.value || '').trim().length === 0;
        const isValid = !isWhitespace;
        return isValid ? null : { whitespace: true };
    }
}
