import { Component, HostListener } from '@angular/core';
import { ReusableComponent } from './reusable/reusable.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
	constructor(
		private reusable: ReusableComponent,
	) {	}

  resizeId;
  @HostListener('window:resize', ['$event'])
  onResize(event) {
      clearTimeout(this.resizeId);
      this.resizeId = setTimeout(() => {
        this.reusable.screenChange.next({height:event.target.innerHeight, width:event.target.innerWidth});
      }, 1000);
  }
}
