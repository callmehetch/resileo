import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthServiceService } from '../auth-service.service';


@Injectable()
export class NotAuthGuard implements CanActivate {

    constructor(
        private router: Router,
        private authService: AuthServiceService
    ) { }

    canActivate() {
        if(this.authService.loggedIn()){
            this.router.navigate(['login']);
            return false;
        } else {
            return true;
        }
    }
}