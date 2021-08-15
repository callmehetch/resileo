import { Component, HostListener } from '@angular/core';
import { Title }     from '@angular/platform-browser';
import { AuthServiceService} from './auth-service.service';
import { observable, Observable, fromEvent, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators'
import { ReusableComponent } from './reusable/reusable.component'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private screenChangeEvent = new Subject();
  constructor(
    private titleService: Title, 
    private authService: AuthServiceService,
    private reusable: ReusableComponent
  ){
    this.titleService.setTitle("Workflow");
  }

  ngOnInit(){
    this.screenChangeEvent
      .pipe(debounceTime(1000))
      .subscribe(e => {
        let ht = e['target']['innerHeight'] - 64;
        let width = e['target']['innerWidth'] - 20;
        this.authService.screenChange.next({height:ht, width:width,resize:true});
      })
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (event != undefined)
      this.screenChangeEvent.next(event);
  }
}
