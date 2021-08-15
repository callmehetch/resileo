import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '../material'
import { FlexLayoutModule } from '@angular/flex-layout';
import { UserRoutingModule } from './user-routing.module';
import { UserComponent, UserAddeditDialog, ResetPasswordDialog} from './user.component';
import { HeaderModule } from '../header/header.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule,
    UserRoutingModule,
    HeaderModule,
  ],
  declarations: [
    UserComponent,
    UserAddeditDialog,
    ResetPasswordDialog
  ],
  entryComponents: [
    UserAddeditDialog,
    ResetPasswordDialog
  ],

})
export class UserModule { }

