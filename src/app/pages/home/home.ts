import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  protected readonly tiles = [
    {
      title: 'Workshop Lab Sheets',
      text: 'Access all the workshop lab sheets',
      path: '/workshops',
      accent: 'var(--colour-primary)',
    },
    {
      title: 'Events',
      text: 'Check our calendar for upcoming socials and workshops',
      path: '/events',
      accent: 'var(--colour-secondary-blue)',
    },
    {
      title: "Members' FAQs",
      text: 'Get your most frequently asked questions answered here',
      path: '/faqs',
      accent: 'var(--colour-secondary-green)',
    },
    {
      title: 'About Us',
      text: 'Our email, address, and where to find us on social media',
      path: '/about',
      accent: 'var(--colour-primary)',
    },
  ];
}
