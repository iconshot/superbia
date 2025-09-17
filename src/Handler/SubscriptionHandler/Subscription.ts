import { EverEmitter } from "everemitter";

import { SubscriptionController } from "./SubscriptionController";

type SubscriptionSignatures = {
  subscribe: () => any;
  unsubscribe: () => any;
};

export class Subscription extends EverEmitter<SubscriptionSignatures> {
  constructor(private subscriptionController: SubscriptionController) {
    super();
  }

  public subscribe(channelKey: string | string[]): void {
    if (this.subscriptionController.destroyed) {
      return;
    }

    const channelKeys = Array.isArray(channelKey) ? channelKey : [channelKey];

    this.subscriptionController.clearChannelKeys();

    this.subscriptionController.setChannelKeys(channelKeys);

    this.emit("subscribe");
  }

  public unsubscribe(): void {
    if (this.subscriptionController.destroyed) {
      return;
    }

    this.subscriptionController.clearChannelKeys();

    this.emit("unsubscribe");
  }

  public get active(): boolean {
    return !this.subscriptionController.destroyed;
  }
}
