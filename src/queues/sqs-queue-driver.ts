import async from 'async';
import { Consumer } from 'sqs-consumer';
import { createHash } from 'crypto';
import { Job } from '../job';
import { JobData } from '../webhook-sender';
import { Log } from '../log';
import { QueueInterface } from './queue-interface';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Server } from '../server';
import { randomUUID } from 'crypto';

export class SqsQueueDriver implements QueueInterface {
    /**
     * The list of consumers with their instance.
     */
    protected queueWithConsumer: Map<string, Consumer> = new Map();

    /**
     * Initialize the Prometheus exporter.
     */
    constructor(protected server: Server) {
        //
    }

    /**
     * Add a new event with data to queue.
     */
    addToQueue(queueName: string, data: JobData): Promise<void> {
        return new Promise(resolve => {
            let message = JSON.stringify(data);

            let params = {
                MessageBody: message,
                MessageDeduplicationId: createHash('sha256').update(message).digest('hex'),
                MessageGroupId: `${data.appId}_${queueName}`,
                QueueUrl: this.server.options.queue.sqs.queueUrl,
            };

            this.sqsClient().send(new SendMessageCommand(params)).then(response => {
                if (this.server.options.debug) {
                    Log.successTitle('✅ SQS client publsihed message to the queue.');
                    Log.success({ data: response, params, queueName });
                }

                resolve();
            }).catch(err => {
                Log.errorTitle('❎ SQS client could not publish to the queue.');
                Log.error({ err, params, queueName });

                resolve();
            });
        });
    }

    /**
     * Register the code to run when handing the queue.
     */
    processQueue(queueName: string, callback: CallableFunction): Promise<void> {
        return new Promise(resolve => {
            let handleMessage = ({ Body }: { Body: string; }) => {
                return new Promise<void>(resolve => {
                    callback(
                        new Job(randomUUID(), JSON.parse(Body)),
                        () => {
                            if (this.server.options.debug) {
                                Log.successTitle('✅ SQS message processed.');
                                Log.success({ Body, queueName });
                            }

                            resolve();
                        },
                    );
                });
            };

            const sqsOptions = this.server.options.queue.sqs;

            const consumer = Consumer.create({
                queueUrl: sqsOptions.queueUrl,
                sqs: this.sqsClient(),
                batchSize: sqsOptions.batchSize,
                pollingWaitTimeMs: sqsOptions.pollingWaitTimeMs,
                ...(sqsOptions.processBatch
                    ? {
                        handleMessageBatch: (messages) => Promise.all(
                            messages.map(({ Body }) => handleMessage({ Body: Body ?? '' })),
                        ).then(() => undefined),
                    }
                    : {
                        handleMessage: ({ Body }) => handleMessage({ Body: Body ?? '' }).then(() => undefined),
                    }),
                ...sqsOptions.consumerOptions,
            });

            consumer.start();

            this.queueWithConsumer.set(queueName, consumer);

            resolve();
        });
    }

    /**
     * Clear the queues for a graceful shutdown.
     */
    disconnect(): Promise<void> {
        return async.each([...this.queueWithConsumer], ([queueName, consumer]: [string, Consumer], callback) => {
            if (consumer.status?.isRunning) {
                consumer.stop();
                callback();
            }
        });
    }

    /**
     * Get the SQS client.
     */
    protected sqsClient(): SQSClient {
        let sqsOptions = this.server.options.queue.sqs;

        return new SQSClient({
            apiVersion: '2012-11-05',
            region: sqsOptions.region || 'us-east-1',
            endpoint: sqsOptions.endpoint ?? undefined,
            ...sqsOptions.clientOptions,
        });
    }
}
