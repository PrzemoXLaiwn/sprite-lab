import { Text } from "@react-email/components";
import * as React from "react";
import { postalAddress } from "../flags";

/**
 * The sender's postal address (EMAIL_POSTAL_ADDRESS) for marketing footers.
 * Renders nothing while it isn't configured — we never invent one; the admin
 * page warns instead.
 */
export function PostalAddressLine({ style }: { style?: React.CSSProperties }) {
  const address = postalAddress();
  if (!address) return null;
  return <Text style={style}>{address}</Text>;
}
