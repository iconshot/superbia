import { SubscriptionController } from "./SubscriptionController";

export class Socket {
  private subscriptionControllers: Map<number, SubscriptionController> =
    new Map();

  public getSubscriptionController(
    subscriptionKey: number
  ): SubscriptionController | undefined {
    return this.subscriptionControllers.get(subscriptionKey);
  }

  public deleteSubscriptionController(subscriptionKey: number): void {
    this.subscriptionControllers.delete(subscriptionKey);
  }

  public hasSubscriptionController(subscriptionKey: number): boolean {
    return this.subscriptionControllers.has(subscriptionKey);
  }

  public createSubscriptionController(
    subscriptionKey: number
  ): SubscriptionController {
    const subscriptionController = new SubscriptionController(
      subscriptionKey,
      this
    );

    this.subscriptionControllers.set(subscriptionKey, subscriptionController);

    return subscriptionController;
  }

  public destroy(): void {
    this.subscriptionControllers.forEach((subscriptionController): void => {
      subscriptionController.destroy();
    });
  }
}
