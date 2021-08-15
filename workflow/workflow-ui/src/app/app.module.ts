import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JwtModule } from '@auth0/angular-jwt';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './material';

import { AuthGuard } from './_guards/index';
import { NotAuthGuard } from './_guards/notauth.guard'
import { AuthServiceService } from './auth-service.service';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { ReusableComponent } from './reusable/reusable.component';
import { AlertComponent } from './_directives';
import { MatNativeDateModule, DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatMomentDateModule, MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from "@angular/material-moment-adapter";
import { FileUploadModule } from 'ng2-file-upload';
export function tokenGetter() {
  return sessionStorage.getItem('token');
}

export const DATE_FORMAT = {
  parse: {
    dateInput: 'll',
  },
  display: {
    dateInput: 'll',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@NgModule({
  declarations: [
    AppComponent,
    ReusableComponent,
    AlertComponent,
    //ProjectsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    MaterialModule,
    BrowserAnimationsModule,
    MatNativeDateModule,
    MatMomentDateModule,
    FileUploadModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
          whitelistedDomains:['localhost:4200', 'localhost:4040'],
          authScheme:''
      }
    }),
  ],
  providers: [
    AuthGuard,
    NotAuthGuard,
    Title,
    AuthServiceService,
    ReusableComponent,
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 5000}},
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    {provide: MAT_DATE_FORMATS, useValue: DATE_FORMAT},
  ],
  entryComponents: [
    AlertComponent,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
