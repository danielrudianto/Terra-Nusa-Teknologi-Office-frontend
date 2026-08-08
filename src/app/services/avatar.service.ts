import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AvatarConfig,
  DEFAULT_AVATAR,
} from '../components/avatar/avatar-parts/avatar-parts.component';
/**
 * Fetches avatar configs and keeps them in memory.
 *
 * List views ask for many avatars at once, so instead of firing one request per
 * row we buffer the ids requested within the same tick and send a single
 * `/user-avatars/batch` call. Results are cached, so re-rendering a list (or
 * opening a dialog for the same user) costs nothing.
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  constructor(private apiService: ApiService) {}

  /** userID -> live config stream */
  private cache = new Map<number, BehaviorSubject<AvatarConfig>>();
  /** ids waiting to be sent in the next batch */
  private pending = new Set<number>();
  private flushScheduled = false;

  /**
   * Get an avatar as a stream. Emits the default immediately, then the real
   * config once it arrives — so the UI never waits on a network round trip.
   */
  get(userId: number | null | undefined): Observable<AvatarConfig> {
    if (userId == null) {
      return new BehaviorSubject<AvatarConfig>({
        ...DEFAULT_AVATAR,
      }).asObservable();
    }

    let subject = this.cache.get(userId);
    if (!subject) {
      subject = new BehaviorSubject<AvatarConfig>({ ...DEFAULT_AVATAR });
      this.cache.set(userId, subject);
      this.queue(userId);
    }
    return subject.asObservable();
  }

  /** Push an id into the buffer and schedule a flush for the next tick. */
  private queue(userId: number): void {
    this.pending.add(userId);
    if (this.flushScheduled) return;

    this.flushScheduled = true;
    // queueMicrotask would fire before sibling rows render; a 0ms timeout lets
    // the whole list register first so we really do send one request.
    setTimeout(() => this.flush(), 0);
  }

  private flush(): void {
    this.flushScheduled = false;
    const ids = Array.from(this.pending);
    this.pending.clear();
    if (ids.length === 0) return;

    this.apiService.get('user-avatars/batch', { ids }).subscribe({
      next: (rows: any) => {
        if (!Array.isArray(rows)) return;
        for (const row of rows) {
          const subject = this.cache.get(row.userID);
          if (subject) {
            subject.next({ ...DEFAULT_AVATAR, ...row });
          }
        }
      },
      error: () => {
        // leave the defaults in place — an avatar is never worth an error toast
      },
    });
  }

  /**
   * Replace a cached avatar (call after saving in the builder) so every view
   * showing this user updates without a refresh.
   */
  update(userId: number, config: Partial<AvatarConfig>): void {
    const subject = this.cache.get(userId);
    const next = { ...DEFAULT_AVATAR, ...config } as AvatarConfig;
    if (subject) {
      subject.next(next);
    } else {
      this.cache.set(userId, new BehaviorSubject<AvatarConfig>(next));
    }
  }

  /** Persist an avatar for a user. */
  save(userId: number, config: Partial<AvatarConfig>) {
    return this.apiService.put('user-avatars/' + userId, config);
  }

  /** Drop everything (e.g. on logout). */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
}
