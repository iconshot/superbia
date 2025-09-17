import { EverEmitter } from "everemitter";

import { SubscriptionEndpoint } from "../../Endpoint/SubscriptionEndpoint";

import { ContextRecord } from "../../Context/ContextManager";

import { Type, TypeSchema } from "../../Type";

import { Subscription } from "./Subscription";
import { Socket } from "./Socket";

type SubscriptionControllerSignatures = {
  result: (value: any) => any;
};

export class SubscriptionController extends EverEmitter<SubscriptionControllerSignatures> {
  private channelKeys: Set<string> = new Set();

  public resolved: boolean = false;

  public destroyed: boolean = false;

  public subscription: Subscription | null = null;

  private subscriptionEndpoint: SubscriptionEndpoint<
    ContextRecord | null,
    TypeSchema | null,
    Type<any> | null
  > | null = null;

  public listener: (value: any) => void;

  constructor(private subscriptionKey: number, private socket: Socket) {
    super();

    this.listener = (value): void => {
      if (!this.resolved) {
        return;
      }

      this.emit("result", value);
    };
  }

  public initialize(
    subscriptionEndpoint: SubscriptionEndpoint<
      ContextRecord | null,
      TypeSchema | null,
      Type<any> | null
    >
  ): void {
    this.subscription = new Subscription(this);

    this.subscriptionEndpoint = subscriptionEndpoint;
  }

  public destroy(): void {
    this.socket.deleteSubscriptionController(this.subscriptionKey);

    this.subscription?.unsubscribe();

    this.destroyed = true;
  }

  public setChannelKeys(channelKeys: string[]): void {
    channelKeys.forEach((channelKey): void => {
      this.channelKeys.add(channelKey);

      this.subscriptionEndpoint!.emitter.on(channelKey, this.listener);
    });
  }

  public clearChannelKeys(): void {
    this.channelKeys.forEach((channelKey): void => {
      this.subscriptionEndpoint!.emitter.off(channelKey, this.listener);
    });

    this.channelKeys.clear();
  }
}
