import { EventEmitter } from "@yume-chan/event";
import serverUrl from 'file-loader!./scrcpy-server-v1.17';

export const ScrcpyServerVersion = '1.17';

class FetchWithProgress {
    readonly promise: Promise<ArrayBuffer>;

    private _downloaded = 0;
    get downloaded() { return this._downloaded; }

    private _total = 0;
    get total() { return this._total; }

    private progressEvent = new EventEmitter<[download: number, total: number]>();
    get onProgress() { return this.progressEvent.event; }

    constructor(url: string) {
        this.promise = this.fetch(url);
    }

    private async fetch(url: string) {
        const response = await window.fetch(url);
        this._total = Number.parseInt(response.headers.get('Content-Length') ?? '0', 10);
        this.progressEvent.fire([this._downloaded, this._total]);

        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
            const result = await reader.read();
            if (result.done) {
                break;
            }
            chunks.push(result.value);
            this._downloaded += result.value.byteLength;
            this.progressEvent.fire([this._downloaded, this._total]);
        }

        this._total = chunks.reduce((result, item) => result + item.byteLength, 0);
        const result = new Uint8Array(this._total);
        let position = 0;
        for (const chunk of chunks) {
            result.set(chunk, position);
            position += chunk.byteLength;
        }
        return result.buffer;
    }
}

let cachedValue: FetchWithProgress | undefined;
export function fetchServer(onProgress?: (e: [downloaded: number, total: number]) => void) {
    if (!cachedValue) {
        cachedValue = new FetchWithProgress(serverUrl);
    }

    if (onProgress) {
        cachedValue.onProgress(onProgress);
        onProgress([cachedValue.downloaded, cachedValue.total]);
    }

    return cachedValue.promise;
}
