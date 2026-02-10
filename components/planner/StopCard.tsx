import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DeliveryDTO, RouteStopItem } from "@/lib/types/planner";

export default function StopCard({
  id,
  vehicleId,
  index,
  stop,
  deliveriesById,
  stopTime
}: {
  id: string;
  vehicleId: string | number;
  index: number;
  stop: RouteStopItem[];
  deliveriesById?: Map<string, DeliveryDTO>;
  stopTime?: { arrival_hhmm?: string; departure_hhmm?: string; arrival_s?: number; departure_s?: number };
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: { vehicleId, index }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const label = stop.find((s) => s.type === "delivery")?.job_name || stop[0]?.label || "Stop";
  const formatFromSeconds = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return "--";
    const baseMinutes = 6 * 60;
    const totalMinutes = baseMinutes + Math.round(seconds / 60);
    const hh = Math.floor(totalMinutes / 60) % 24;
    const mm = totalMinutes % 60;
    const period = hh >= 12 ? "PM" : "AM";
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
  };

  const formatFromHHMM = (value?: string) => {
    if (!value) return "--";
    const parts = value.split(":");
    const h = Number(parts[0] || 0);
    const m = Number(parts[1] || 0);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
  };

  const arrival = stopTime?.arrival_s != null
    ? formatFromSeconds(stopTime?.arrival_s)
    : formatFromHHMM(stopTime?.arrival_hhmm);
  const departure = stopTime?.departure_s != null
    ? formatFromSeconds(stopTime?.departure_s)
    : formatFromHHMM(stopTime?.departure_hhmm);
  const deliveryStops = stop.filter((s) => s.type === "delivery" && s.id);
  const uniqueIds = Array.from(new Set(deliveryStops.map((s) => String(s.id))));
  const deliveries = deliveriesById
    ? uniqueIds.map((id) => deliveriesById.get(id)).filter(Boolean) as DeliveryDTO[]
    : [];

  const salesOrders = deliveries.map((d) => d.sales_order).filter(Boolean);

  const totals = deliveryStops.reduce(
    (acc, stopItem) => {
      if (!stopItem.id || !deliveriesById) return acc;
      const delivery = deliveriesById.get(String(stopItem.id));
      if (!delivery) return acc;

      const deliveryUnits = delivery.capacity_units || 0;
      const medSkidTotal = delivery.med_skid || 0;
      let scale = 1;

      if (stopItem.units != null && deliveryUnits > 0) {
        scale = Number(stopItem.units) / deliveryUnits;
      } else if (stopItem.qty != null && medSkidTotal > 0) {
        scale = Number(stopItem.qty) / medSkidTotal;
      }

      const scaled = (value?: number) => (value || 0) * scale;

      if (stopItem.qty != null) {
        acc.med_skid += Number(stopItem.qty) || 0;
      } else {
        acc.med_skid += scaled(delivery.med_skid);
      }
      acc.small_skid += scaled(delivery.small_skid);
      acc.large_skid += scaled(delivery.large_skid);
      acc.door += scaled(delivery.door);
      acc.frame += scaled(delivery.frame);
      acc.exp_frame += scaled(delivery.exp_frame);
      acc.box += scaled(delivery.box);
      return acc;
    },
    { med_skid: 0, small_skid: 0, large_skid: 0, door: 0, frame: 0, exp_frame: 0, box: 0 }
  );

  const formatQty = (value: number) => {
    if (Number.isNaN(value)) return "";
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const totalsLine = [
    totals.door ? `Door ${formatQty(totals.door)}` : "",
    totals.frame ? `Frame ${formatQty(totals.frame)}` : "",
    totals.exp_frame ? `Exp ${formatQty(totals.exp_frame)}` : "",
    totals.med_skid ? `Med ${formatQty(totals.med_skid)}` : "",
    totals.small_skid ? `Small ${formatQty(totals.small_skid)}` : "",
    totals.large_skid ? `Large ${formatQty(totals.large_skid)}` : "",
    totals.box ? `Box ${formatQty(totals.box)}` : ""
  ].filter(Boolean).join(" - ");

  const deliveriesCount = uniqueIds.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full text-left rounded-lg border border-steel-100 bg-white px-3 py-2 hover:border-ink-900"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-steel-500">{arrival} {"\u2192"} {departure}</div>
      </div>
      {salesOrders.length > 0 && <div className="text-xs text-steel-500">SO: {salesOrders.join(", ")}</div>}
      <div className="text-xs text-steel-500">Deliveries: {deliveriesCount || deliveryStops.length}</div>
      <div className="text-xs text-steel-500">{totalsLine || "No items"}</div>
    </div>
  );
}
