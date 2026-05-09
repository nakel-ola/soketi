import { randomUUID } from 'crypto';

export class Job {
    /**
     * Create a new job instance.
     */
    constructor(public id: string = randomUUID(), public data: { [key: string]: any; } = {}) {
        //
    }
}
