import { getInstantlyClient, type InstantlyClient } from "../instantly/client.js";
import type { AddLeadRequest, AddLeadResponse } from "../instantly/types.js";
import type { InstantlyColdEmailPort } from "./types.js";

export class InstantlyColdEmailAdapter implements InstantlyColdEmailPort {
  constructor(private readonly client: InstantlyClient) {}

  addLead(req: AddLeadRequest): Promise<AddLeadResponse> {
    return this.client.addLead(req);
  }
}

export function createInstantlyColdEmailProvider(
  client: InstantlyClient = getInstantlyClient(),
): InstantlyColdEmailAdapter {
  return new InstantlyColdEmailAdapter(client);
}
