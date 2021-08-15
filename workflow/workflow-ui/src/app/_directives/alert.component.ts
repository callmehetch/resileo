import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
    selector: 'alert',
    templateUrl: 'alert.component.html'
})
export class AlertComponent {
    message; bgColor; clr; iconClr;
    constructor(
        @Inject(MAT_SNACK_BAR_DATA) public data: any,
    ) { }

    playAudioInfo(){
        let audio = new Audio();
        audio.src = "../../assets/audio/Speech Sleep.wav";
        audio.load();
        audio.play();
    }

    playAudioError(){
        let audio = new Audio();
        audio.src = "../../assets/audio/ringout.wav";
        audio.load();
        audio.play();
    }

    ngOnInit(){
        this.message = this.data.message;
        if (this.data.type == "info"){
            this.iconClr = "green";
            this.playAudioInfo();
        } else if (this.data.type == "error"){
            this.iconClr = "#ff5722";
            this.playAudioError();
        } else {
            this.iconClr = "darkorange"
        }
    }
}
