import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  standalone: false,
  templateUrl: './placeholder-page.component.html',
  styleUrls: ['./placeholder-page.component.scss'],
})
export class PlaceholderPageComponent {
  @Input() screen = '';
}
