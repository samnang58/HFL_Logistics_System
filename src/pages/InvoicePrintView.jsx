import React, { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getInvoice } from "../services/billingApi.js";
import apiClient from "../api/apiClient.js";

import "./invoice-print.css";

const money = (value) =>
  `$${Number(value || 0).toFixed(2)}`;

const fixed = (value, digits = 3) =>
  Number(value || 0).toFixed(digits);

export default function InvoicePrintView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInvoice();
  }, [id]);

  async function loadInvoice() {
    try {
      setLoading(true);

      const [invoiceResult, settingsResult] =
        await Promise.all([
          getInvoice(id),
          apiClient.get("/billing/settings"),
        ]);

      setInvoice(invoiceResult);

      setSettings(
        settingsResult?.data ||
          settingsResult ||
          {}
      );
    } catch (err) {
      setError(
        err?.message || "Unable to load invoice."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bill-loading">
        Loading Bill...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bill-loading bill-error">
        {error || "Bill not found."}
      </div>
    );
  }

  const items = Array.isArray(invoice.items)
    ? invoice.items
    : [];

  const payments = Array.isArray(invoice.payments)
    ? invoice.payments
    : [];

  const payment = payments[0] || {};

  const meta = invoice.meta || {};

  const dateValue =
    invoice.created_at ||
    invoice.invoice_date ||
    meta.bill_date;

  const dateText = dateValue
    ? new Date(dateValue).toLocaleDateString("en-GB")
    : "—";

  const subtotal = Number(
    invoice.subtotal || 0
  );

  const discount = Number(
    invoice.discount || 0
  );

  const grandTotal = Number(
    invoice.grand_total ??
      invoice.grandTotal ??
      0
  );

  const paidAmount = Number(
    invoice.paid_amount ??
      invoice.paidAmount ??
      0
  );

  const outstanding = Number(
    invoice.outstanding || 0
  );

  const totalCbm = items.reduce(
    (sum, item) =>
      sum + Number(item.cbm || 0),
    0
  );

  const totalWeight = items.reduce(
    (sum, item) =>
      sum + Number(item.weight || 0),
    0
  );

  const printBill = () => {
    window.print();
  };

  return (
    <div className="bill-print-wrapper">

      {/* =========================
          BUTTONS
      ========================== */}

      <div className="bill-toolbar no-print">

        <button
          className="bill-toolbar-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          className="bill-toolbar-btn primary"
          onClick={printBill}
        >
          <Printer size={16} />
          Print Bill
        </button>

      </div>

      {/* =========================
          A5 LANDSCAPE
      ========================== */}

      <main className="a5-bill">

        {/* =========================
            HEADER
        ========================== */}

        <header className="paper-header">

          {/* LOGO */}

          <div className="paper-logo-area">
              <img
                src="/img/profile.jpg"
                alt="HFL Logistics"
                className="hfl-logo"
              />

              <div className="logo-company">
                
              
              </div>
            </div>

          {/* COMPANY */}

          <div className="paper-company-title">

            <div className="khmer-company">
              ក្រុមហ៊ុនដឹកជញ្ជូនពីចិនមកខ្មែរ
            </div>

            <div className="english-company">
              HFL LOGISTICS CO., LTD.
            </div>

            <div className="chinese-company">
              海发物流有限公司
            </div>

          </div>

          {/* INVOICE */}

          <div className="paper-invoice-title">

            <div>
              វិក័យប័ត្រ
            </div>

            <span>
              发票
            </span>

          </div>

        </header>

        {/* =========================
            CUSTOMER / STATUS / ABA
        ========================== */}

        <section className="top-info">

          {/* CUSTOMER */}

          <div className="customer-info">

            <div className="form-row">
              <span>
                អតិថិជន / 客户
              </span>

              <strong>
                {invoice.customer_name || "—"}
              </strong>
            </div>

            <div className="form-row">
              <span>
                លេខទូ / 柜号
              </span>

              <strong>
                {meta.container_number || "—"}
              </strong>
            </div>

            <div className="form-row">
              <span>
                Date
              </span>

              <strong>
                {dateText}
              </strong>
            </div>

            <div className="form-row">
              <span>
                Customer ID
              </span>

              <strong>
                {invoice.customer_id || "—"}
              </strong>
            </div>

          </div>

          {/* STATUS */}

          <div className="status-area">

            <div className="status-row">
              <span>
                ផ្លូវគោក / 直邮
              </span>

              <b className="checkbox">
                
              </b>
            </div>

            <div className="status-row">
              <span>
                ផ្លូវសមុទ្រ / 海运
              </span>

              <b className="checkbox" />
            </div>

            <div className="status-row">
              <span>
                ផ្លូវអាកាស / 空运
              </span>

              <b className="checkbox" />
            </div>

            <div className="status-row">
              <span>
                ផ្លូវផ្សេងៗ / 其他
              </span>

              <b className="checkbox" />
            </div>

          </div>

          {/* NO + ABA QR */}

          <div className="document-info">

            <div className="doc-no">
              No:
              <strong>
                {invoice.invoice_no || "—"}
              </strong>
            </div>

            <div className="aba-payment">

              <div className="aba-details">

                <div className="aba-label">
                  គណនី ABA
                </div>

                <div className="aba-account">
                  {settings.aba_account ||
                    "800 700 888"}
                </div>

                <div className="aba-holder">
                  {settings.account_name ||
                    "GOV HAK KHOUT"}
                </div>

              </div>

              {settings.aba_khqr_url ? (
                <div className="aba-qr">
                  <img
                    src={settings.aba_khqr_url}
                    alt="ABA KHQR"
                  />
                </div>
              ) : (
                <div className="aba-qr-empty">
                  ABA
                  <br />
                  KHQR
                </div>
              )}

            </div>

          </div>

        </section>

        {/* =========================
            SHIPMENT INFORMATION
        ========================== */}

        <section className="shipment-row">

          <div>
            Origin:
            <strong>
              {meta.origin || "China"}
            </strong>
          </div>

          <div>
            Destination:
            <strong>
              {meta.destination || "Cambodia"}
            </strong>
          </div>

          <div>
            Shipment:
            <strong>
              {meta.shipment_number || "—"}
            </strong>
          </div>

          <div>
            Tracking:
            <strong>
              {meta.tracking_number || "—"}
            </strong>
          </div>

        </section>

        {/* =========================
            TABLE
        ========================== */}

        <table className="paper-table">

          <thead>

            <tr>

              <th>
                ល.រ
                <br />
                No
              </th>

              <th>
                លេខទំនិញ
                <br />
                快递单号
              </th>

              <th>
                ឈ្មោះទំនិញ
                <br />
                品名
              </th>

              <th>
                លេខកញ្ចប់
                <br />
                Package
              </th>

              <th>
                ចំនួន
                <br />
                数量
              </th>

              <th>
                ទំហំ
                <br />
                尺寸
              </th>

              <th>
                តម្លៃ
                <br />
                单价
              </th>

              <th>
                ទម្ងន់
                <br />
                重量
              </th>

              <th>
                សរុប
                <br />
                合计
              </th>

            </tr>

          </thead>

          <tbody>

            {items.length > 0 ? (
              items.map((item, index) => (

                <tr key={index}>

                  <td>
                    {index + 1}
                  </td>

                  <td>
                    {item.tracking_number ||
                      item.code ||
                      "—"}
                  </td>

                  <td className="item-name">
                    {item.description ||
                      item.product_name ||
                      "—"}
                  </td>

                  <td>
                    {item.package_id ||
                      item.package_number ||
                      "—"}
                  </td>

                  <td>
                    {Number(
                      item.quantity || 1
                    )}
                  </td>

                  <td>
                    {fixed(item.cbm, 3)}
                  </td>

                  <td>
                    {money(item.unit_price)}
                  </td>

                  <td>
                    {fixed(item.weight, 2)}
                  </td>

                  <td className="amount">
                    {money(item.amount)}
                  </td>

                </tr>

              ))
            ) : (

              <tr>

                <td>1</td>

                <td>
                  {meta.tracking_number || "—"}
                </td>

                <td>
                  China → Cambodia
                </td>

                <td>
                  {meta.hfl_package_code ||
                    meta.package_id ||
                    "—"}
                </td>

                <td>1</td>

                <td>
                  {fixed(totalCbm, 3)}
                </td>

                <td>
                  {money(subtotal)}
                </td>

                <td>
                  {fixed(totalWeight, 2)}
                </td>

                <td className="amount">
                  {money(grandTotal)}
                </td>

              </tr>

            )}

            <tr className="empty-row">
              <td>2</td>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>

            <tr className="empty-row">
              <td>3</td>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>

          </tbody>

        </table>

        {/* =========================
            NOTES + TOTAL
        ========================== */}

        <section className="bottom-section">

          <div className="notes-area">

            <div>
              ចំណាំ៖ មុនទទួលទំនិញសូមពិនិត្យម៉ែត្រគីប គីឡូក្រាម និងតម្លៃអោយបានត្រឹមត្រូវទំនិញត្រូវបានត្រួតពិនិត្យ
              និងរាប់តាមព័ត៌មានដែលបានបញ្ជាក់
              នៅលើវិក្កយបត្រ សម្រាប់ទំនិញដែរទទួលរួចក្រុមហ៊ុនមិនទទួលខុសត្រូវ។
            </div>

            <div className="chinese-note">
              注意：在收货前，请仔细检查货物的重量、体积和价格是否正确。货物应按照发票上所列信息进行核对和清点。对于已经签收的货物，公司不承担任何责任。
            </div>

            <div>
              ក្រុមហ៊ុនមិនទទួលខុសត្រូវចំពោះទំនិញដែលងាយខូចបែកបាក់ ចំពោះទំនិញដែលងាយបែកបាក់ក្រុមហ៊ុនគ្មានសំណងនោះទេ។ សូមចូលចិត្តទំនិញដែលងាយខូចបែកបាក់សូមប្រើប្រអប់ក្រដាសក្រណាត់ដើម្បីការពារទំនិញ។ 
              
              <div className="chinese-note">
              公司对易碎、易损坏的货物不承担责任。对于易碎、易损坏的货物，公司不提供任何赔偿。
              请注意：如果您的货物属于易碎或易损坏物品，请使用纸箱、泡沫、布料等适当的包装材料进行加固和保护，以避免运输过程中发生损坏。
            </div>
            </div>

          </div>

          <div className="total-area">

            <div>
              <span>
                ការបញ្ចុះតម្លៃ
              </span>

              <strong>
                {money(discount)}
              </strong>
            </div>

            <div className="total-final">

              <span>
                សរុប / 合计
              </span>

              <strong>
                {money(grandTotal)}
              </strong>

            </div>

          </div>

        </section>

        {/* =========================
            SIGNATURE
        ========================== */}

        <section className="signature-area">

          <div>
            <strong>
              អ្នករៀបចំវិក្កយបត្រ
            </strong>

            <span>
              制单人:
            </span>

            <div className="signature-line" />
          </div>

          <div>
            <strong>
              អតិថិជន
            </strong>

            <span>
              客户签收:
            </span>

            <div className="signature-line" />
          </div>

        </section>

      </main>
    </div>
  );
}