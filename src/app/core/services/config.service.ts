import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RemoteConfig } from '@angular/fire/remote-config';
import { fetchAndActivate, getString } from 'firebase/remote-config';

import { environment } from '../../../environments/environment';

const KEY_API_URL = 'api_url';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private apiUrl: string = environment.apiURL;
  private readonly fetching$ = new BehaviorSubject<boolean>(false);

  constructor(private remoteConfig: RemoteConfig) {
    this.remoteConfig.settings = {
      minimumFetchIntervalMillis: 0,
      fetchTimeoutMillis: 10_000,
    };
    this.remoteConfig.defaultConfig = {
      [KEY_API_URL]: environment.apiURL,
    };
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  isFetching$(): Observable<boolean> {
    return this.fetching$.asObservable();
  }

  async refresh(): Promise<string> {
    this.fetching$.next(true);
    try {
      await fetchAndActivate(this.remoteConfig);
      const remoteUrl = getString(this.remoteConfig, KEY_API_URL);
      if (remoteUrl) this.apiUrl = remoteUrl;
      return this.apiUrl;
    } finally {
      this.fetching$.next(false);
    }
  }
}
