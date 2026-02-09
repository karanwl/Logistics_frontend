import { redirect } from "next/navigation";

export default function AdminDeliveryRedirect({
  params
}: {
  params: { deliveryId: string };
}) {
  redirect(`/deliveries/${params.deliveryId}`);
}
