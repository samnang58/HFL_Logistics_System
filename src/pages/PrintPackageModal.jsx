import React, { useMemo, useState } from "react";
import {
  X, Printer, Eye, Plus, Minus, ChevronDown, FileText,
  CheckSquare, Square
} from "lucide-react";

const defaultPackageInfo = {
  id: "HFL9761-JPZ",
  number: "11513",
  status: "Unloaded",
  customer: "HFL9761-JPZ",
  customerName: "HFL9761-JPZ",
  title: "by air normal",
  containerId: "by air",
  shippingDate: "2026-09-14 09:11:14",
  fromTo: "Asia / Phnom_Penh",
  shippingMode: "AIR - CHINA - CAMBODIA",
  trackingNumber: "906476403582",
  weight: "4.000",
  volume: "0.000",
  dimension: "-",
  sizeUom: "-",
  weightPrice: "10.00",
  volumePrice: "0.00",
  packagePrice: "40.00",
  pricingList: "AIR - CHINA - CAMBODIA",
  fromWarehouse: "GuangZhou - HFL",
  toWarehouse: "Sensok - HFL",
  item: {
    code: "by air",
    name: "by air normal",
    uom: "-",
    qty: "1",
    price: "0.00",
    amount: "0.00",
  },
};

function SelectBox({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="w-full h-9 appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-9 text-[12px] text-slate-700 outline-none focus:border-blue-500"
        >
          <option>{value}</option>
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-3 text-slate-500"
        />
      </div>
    </div>
  );
}

function CheckOption({ checked, onChange, children }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-2.5 py-1.5 text-left text-[13px] text-slate-600 hover:text-slate-800"
    >
      {checked ? (
        <CheckSquare size={19} className="text-blue-600 fill-blue-600 stroke-white" />
      ) : (
        <Square size={19} className="text-slate-300" />
      )}
      <span>{children}</span>
    </button>
  );
}

function WaybillPreview({ options, packageInfo }) {
  const rows = [
    packageInfo.item
  ];

  return (
    <div className="h-full min-h-0 bg-[#dfe7f0] rounded-lg p-4 flex items-center justify-center overflow-auto">
      <div
        className={`bg-white text-slate-800 shadow-xl w-[615px] min-h-[760px] px-5 py-4 ${
          options.blackWhite ? "grayscale" : ""
        }`}
      >
        {/* Company heading */}
        <div className="flex items-start">
          <div className="w-[125px] flex justify-center pt-1">
            <div className="w-[92px] h-[72px] rounded-full border-[5px] border-blue-400 flex items-center justify-center text-[24px] font-extrabold text-blue-700">
              HFL
            </div>
          </div>

          <div className="flex-1 text-center">
            <div className="text-[25px] leading-7 font-extrabold text-blue-800">
              HIGH FAST LOGISTICS
            </div>
            <div className="text-[20px] font-bold text-blue-800">海发国际物流</div>
            <div className="mt-1 text-[13px] font-bold text-blue-800">
              FAST · SAFE · WORLDWIDE
            </div>
            <div className="mt-4 text-[17px] font-extrabold">PACKAGE WAYBILL</div>
          </div>

          <div className="w-[105px] border-l-2 border-blue-500 pl-3 text-[13px] font-bold text-blue-800 leading-6">
            China<br />Cambodia<br />Worldwide
          </div>
        </div>

        {options.barcode && (
          <div className="mt-4 text-center">
            <div className="mx-auto w-[390px] h-[62px] flex items-stretch justify-center gap-[2px] overflow-hidden">
              {Array.from({ length: 72 }).map((_, i) => (
                <span
                  key={i}
                  className="bg-black"
                  style={{ width: i % 7 === 0 ? 5 : i % 3 === 0 ? 2 : 3 }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center items-center gap-4 mt-2">
          <div className="text-center">
            <div className="text-[27px] font-extrabold text-blue-900">
              {packageInfo.id}
            </div>
            <div className="text-[20px] font-bold">({packageInfo.number})</div>
          </div>

          {options.tracking && (
            <div className="w-[70px] h-[70px] border-4 border-slate-900 flex items-center justify-center text-[8px] font-bold">
              QR
            </div>
          )}
        </div>

        <div className="flex justify-end mt-1">
          <div className="rounded-lg overflow-hidden border border-blue-200">
            <div className="px-3 py-1 bg-blue-100 text-[10px] font-semibold text-blue-900 text-center">
              Status
            </div>
            <div className="px-3 py-1.5 bg-blue-600 text-white text-[13px] font-bold text-center">
              {packageInfo.status}
            </div>
          </div>
        </div>

        {/* Main information */}
        <div className="grid grid-cols-2 gap-x-6 mt-3 text-[11px]">
          <div className="space-y-1">
            <div><b>Customer :</b> <span className="ml-4">{packageInfo.customer}</span></div>
            <div><b>Customer Name :</b> <span className="ml-2">{packageInfo.customerName}</span></div>
            <div><b>Title :</b> <span className="ml-8">{packageInfo.title}</span></div>
            <div><b>Container ID :</b> <span className="ml-2">{packageInfo.containerId}</span></div>
          </div>
          <div className="space-y-1">
            <div><b>Shipping Date :</b> <span className="ml-2">{packageInfo.shippingDate}</span></div>
            <div><b>From / To :</b> <span className="ml-5">{packageInfo.fromTo}</span></div>
            <div><b>Shipping Mode :</b> <span className="ml-1">{packageInfo.shippingMode}</span></div>
            <div><b>Tracking Number :</b> <span className="ml-1">{packageInfo.trackingNumber}</span></div>
          </div>
        </div>

        {options.itemDetails && (
          <>
            <div className="font-extrabold text-[12px] mt-3 mb-1">ITEM DETAILS</div>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  {["No.", "Item Code", "Item", "UOM", "Qty", "Price (USD)", "Amount (USD)"].map(x => (
                    <th key={x} className="border border-slate-300 px-2 py-1.5 text-left">{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1.5">{i + 1}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{r.code}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{r.name}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{r.uom}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{r.qty}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{r.price}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="grid grid-cols-2 gap-8 mt-3 text-[10.5px]">
          <div>
            <div className="font-extrabold text-[12px] mb-1">WEIGHT & DIMENSION</div>
            <div>Weight (KG) : <b className="float-right mr-10">{packageInfo.weight}</b></div>
            <div>Volume (CBM) : <b className="float-right mr-10">{packageInfo.volume}</b></div>
            <div>Package Dimension : <b className="float-right mr-10">{packageInfo.dimension}</b></div>
            <div>Size UOM : <b className="float-right mr-10">{packageInfo.sizeUom}</b></div>

            {options.warehouse && (
              <>
                <div className="font-extrabold text-[12px] mt-3 mb-1">WAREHOUSE</div>
                <div>From Warehouse : <b className="float-right mr-2">{packageInfo.fromWarehouse}</b></div>
                <div>To Warehouse : <b className="float-right mr-2">{packageInfo.toWarehouse}</b></div>
              </>
            )}
          </div>

          <div>
            {options.pricing && (
              <>
                <div className="font-extrabold text-[12px] mb-1">PRICING</div>
                <div>Weight Price (USD/KG) : <b className="float-right">{packageInfo.weightPrice}</b></div>
                <div>Volume Price (USD/CBM) : <b className="float-right">{packageInfo.volumePrice}</b></div>
                <div>Package Price (USD) : <b className="float-right">{packageInfo.packagePrice}</b></div>
                <div>Pricing List : <b className="float-right">{packageInfo.pricingList}</b></div>
              </>
            )}

            <div className="font-extrabold text-[12px] mt-3 mb-1">REMARK</div>
            <div className="h-[42px] border border-slate-300 rounded-md" />
          </div>
        </div>

        {options.footer && (
          <div className="mt-5 flex items-end justify-between border-t border-slate-200 pt-3">
            <div className="font-bold text-[11px] leading-4">
              Thank you for choosing HFL Logistics.<br />
              Together We Go Further.
            </div>
            <div className="text-[10px] leading-5">
              <div>◉ www.hfl.com</div>
              <div>⌕ +855 12 345 678</div>
              <div>⌖ Phnom Penh, Cambodia</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintPackageModal({ open = true, onClose, pkg = defaultPackageInfo }) {
  const packageInfo = pkg;
  const [template, setTemplate] = useState("Package Label (A6)");
  const [paper, setPaper] = useState("A6 (105 × 148 mm)");
  const [orientation, setOrientation] = useState("Portrait");
  const [copies, setCopies] = useState(1);
  const [options, setOptions] = useState({
    logo: true,
    tracking: true,
    barcode: true,
    itemDetails: true,
    warehouse: true,
    footer: true,
    blackWhite: false,
    pricing: true,
  });

  const toggle = (key) =>
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-6">
      <div className="w-full max-w-[1180px] h-[calc(100vh-70px)] max-h-[900px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="h-[70px] shrink-0 px-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer size={34} className="text-blue-600" />
            <div>
              <h2 className="text-[23px] font-bold text-slate-900">Print Package</h2>
              <div className="text-[13px] font-semibold text-slate-700">
                {packageInfo.id} ({packageInfo.number})
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          >
            <X size={23} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Controls */}
          <div className="w-[300px] shrink-0 p-5 border-r border-slate-200 overflow-y-auto">
            <SelectBox
              label="Print Template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
            <div className="text-[11px] text-slate-500 mt-1 mb-5">
              Choose a print template
            </div>

            <SelectBox
              label="Paper Size"
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
            />

            <div className="mt-5">
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Portrait", "Landscape"].map((x) => (
                  <button
                    key={x}
                    onClick={() => setOrientation(x)}
                    className={`h-12 rounded-lg border text-[13px] font-semibold ${
                      orientation === x
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-slate-200 text-slate-700 bg-white"
                    }`}
                  >
                    {x === "Portrait" ? "▣ " : "▤ "}{x}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Copies
              </label>
              <div className="h-9 flex border border-slate-300 rounded-lg overflow-hidden w-[152px]">
                <button
                  className="w-10 text-slate-600 hover:bg-slate-50"
                  onClick={() => setCopies((v) => Math.max(1, v - 1))}
                >
                  <Minus size={15} className="mx-auto" />
                </button>
                <div className="flex-1 border-x border-slate-200 flex items-center justify-center text-sm">
                  {copies}
                </div>
                <button
                  className="w-10 text-blue-600 hover:bg-blue-50"
                  onClick={() => setCopies((v) => v + 1)}
                >
                  <Plus size={15} className="mx-auto" />
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Print Options
              </label>
              <CheckOption checked={options.logo} onChange={() => toggle("logo")}>Show Company Logo</CheckOption>
              <CheckOption checked={options.tracking} onChange={() => toggle("tracking")}>Show Tracking Number</CheckOption>
              <CheckOption checked={options.barcode} onChange={() => toggle("barcode")}>Show Barcode</CheckOption>
              <CheckOption checked={options.itemDetails} onChange={() => toggle("itemDetails")}>Show Item Details</CheckOption>
              <CheckOption checked={options.warehouse} onChange={() => toggle("warehouse")}>Show Warehouse Info</CheckOption>
              <CheckOption checked={options.footer} onChange={() => toggle("footer")}>Show Footer</CheckOption>
              <CheckOption checked={options.blackWhite} onChange={() => toggle("blackWhite")}>Print in B/W (Black & White)</CheckOption>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                className="flex-1 h-10 rounded-lg border border-slate-300 bg-white text-blue-600 font-semibold text-[13px] flex items-center justify-center gap-2"
              >
                <Eye size={17} /> Preview
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-lg border border-slate-300 text-slate-600 flex items-center justify-center"
              >
                <X size={17} />
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 h-10 rounded-lg bg-blue-600 text-white font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <Printer size={17} /> Print
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 min-w-0 p-4 bg-slate-100">
            <WaybillPreview options={options} packageInfo={packageInfo} />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > * {
            display: none !important;
          }
          .print-waybill {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
