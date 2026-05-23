import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials', standalone: false })
export class InitialsPipe implements PipeTransform {
  transform(name: string | null | undefined, max = 1): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts
      .slice(-max)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
}
