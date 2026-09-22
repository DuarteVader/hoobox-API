export class OrderCreatedEvent {
  constructor(
    public readonly eventId: string,
    public readonly orderId: string,
    public readonly correlationId: string,
    public readonly occurredAt: string,
  ) {}
}
