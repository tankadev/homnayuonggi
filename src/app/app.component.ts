import { Component, OnInit } from '@angular/core';
import { MessagingService } from './services/messaging.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'homnayuonggi';

  constructor(
    private messagingService: MessagingService
  ) { }

  ngOnInit() {
    this.messagingService.requestPermission()
    this.messagingService.receiveMessage()
    this.messagingService.currentMessage.subscribe(
      mess => {
        // console.log(mess);
      }
    )
  }
}
