import React, { useEffect, useMemo, useState } from "react";
import InstallBanner from "./components/InstallBanner.jsx";



/*
Finance Tracker — full app
- LocalStorage persistence
- Sticky search bar (same width as list, tighter padding)
- Current balance card
- Add/Edit modal (tap tx name to edit). Delete button at bottom + confirm dialog.
- Swipe left to reveal status actions (Scheduled, Auto, Pending, Cleared)
- Solid gray borders for list underlay and status backgrounds; Cleared has rounded right corners
- Dates only (no time) in rows
*/

export default function App() {
  // ---------- Storage ----------
  const STORAGE_KEY = "finance-tracker-pwa-txs";
  const [transactions, setTransactions] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  // ---------- UI State ----------
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [txName, setTxName] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [editTx, setEditTx] = useState(null); // tx being edited (or null)
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmTx, setConfirmTx] = useState(null); // for delete confirm

  // ---------- Swipe state ----------
  const REVEAL = 160;
  const [swipe, setSwipe] = useState({ id: null, startX: 0, dx: 0, openId: null });
  function getClientX(e) {
    if (e.touches && e.touches[0]) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientX;
    return e.clientX ?? 0;
  }
  function handlePointerDown(e, id) {
    const x = getClientX(e);
    setSwipe((s) => ({ ...s, id, startX: x, dx: 0 }));
  }
  function handlePointerMove(e) {
    if (!swipe.id) return;
    const x = getClientX(e);
    let dx = x - swipe.startX; // negative = dragging left
    if (dx > 0) dx = 0; // only left opens
    if (dx < -REVEAL) dx = -REVEAL;
    setSwipe((s) => ({ ...s, dx }));
  }
  function handlePointerUp() {
    if (!swipe.id) return;
    const willOpen = swipe.dx <= -80; // threshold
    setSwipe({ id: null, startX: 0, dx: 0, openId: willOpen ? swipe.id : null });
  }

  // ---------- Helpers ----------
  const overlayStyle = { backgroundColor: "rgba(0,0,0,0.65)" };
  function txBg(status) {
    switch (status) {
      case "Scheduled": return "bg-white border-gray-300 border-solid";
      case "Auto":      return "bg-orange-100 border-gray-300 border-solid";
      case "Pending":   return "bg-yellow-100 border-gray-300 border-solid";
      case "Cleared":   return "bg-green-100 border-gray-300 border-solid";
      default:           return "bg-white border-gray-300 border-solid";
    }
  }
  function safeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now();
  }
  function usd(n) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }
  function formatDate(date) {
    return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  // ---------- Actions ----------
  function startAdd() {
    setEditTx(null);
    setTxName("");
    setTxAmount("");
    setShowForm(true);
  }
  function startEdit(tx) {
    setEditTx(tx);
    setTxName(tx.name);
    setTxAmount(String(tx.amount));
    setShowForm(true);
  }
  function updateStatus(id, status) {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    setSwipe({ id: null, startX: 0, dx: 0, openId: null });
  }
  function removeTransaction(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setEditTx(null);
    setShowForm(false);
    setConfirmTx(null);
  }
  function clearAll() {
    setTransactions([]);
    setConfirmClear(false);
  }
  function addTransactionWithSign(kind) {
    const name = txName.trim();
    const amt = parseFloat(txAmount);
    if (!name || !isFinite(amt) || amt <= 0) return;
    const sign = kind === "credit" ? 1 : -1;
    const now = Date.now();

    if (editTx) {
      setTransactions((prev) => prev.map((t) => t.id === editTx.id
        ? { ...t, name, amount: amt, sign, createdAt: t.createdAt, status: t.status || "Scheduled" }
        : t));
    } else {
      setTransactions((prev) => [
        { id: safeId(), name, amount: amt, sign, createdAt: now, status: "Scheduled" },
        ...prev,
      ]);
    }
    setShowForm(false);
    setEditTx(null);
    setTxName("");
    setTxAmount("");
  }

  // ---------- Derived ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => t.name.toLowerCase().includes(q) || String(t.amount).includes(q));
  }, [transactions, query]);

  const currentBalance = useMemo(() => transactions.reduce((sum, t) => sum + t.amount * t.sign, 0), [transactions]);

  const runningBalancesMap = useMemo(() => {
    const byTimeAsc = [...transactions].sort((a, b) => a.createdAt - b.createdAt);
    const map = new Map();
    let run = 0;
    for (const t of byTimeAsc) {
      run += t.amount * t.sign;
      map.set(t.id, run);
    }
    return map;
  }, [transactions]);

  // ---------- Icons (inline SVGs; solid gray-border backgrounds) ----------
  function IconWrapper({ bgClasses, children, title }) {
    return (
      <div title={title} className={`w-full h-full flex items-center justify-center ${bgClasses}`}>
        {children}
      </div>
    );
  }
  const IconScheduled = (
    <IconWrapper bgClasses="bg-white border-t-2 border-b-2 border-solid border-gray-300">
      <svg viewBox="0 0 25 25" width="20" height="20" aria-hidden="true">
        <path fill="#3a3a3a" d="M22.75,6.29c0-1.6-1.29-2.89-2.89-2.89h-1.03v-1.23h-1.39v1.23H7.56v-1.23h-1.39v1.23h-1.03c-1.6,0-2.89,1.29-2.89,2.89v.39s0,.02,0,.03v13.24c0,1.6,1.29,2.89,2.89,2.89h14.71c1.6,0,2.89-1.29,2.89-2.89v-11.17h0v-2.48ZM20.58,19.94c0,.4-.33.72-.72.72H5.14c-.4,0-.72-.32-.72-.72v-11.17h16.16v11.17Z"/>
        <rect fill="#3a3a3a" x="13.46" y="13.57" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="17.4" y="13.57" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="17.4" y="10.11" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="13.46" y="17.03" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="13.46" y="10.11" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="5.57" y="13.57" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="9.51" y="10.11" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="5.57" y="17.03" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="9.51" y="13.57" width="2.03" height="2.03"/>
        <rect fill="#3a3a3a" x="9.51" y="17.03" width="2.03" height="2.03"/>
      </svg>
    </IconWrapper>
  );
  const IconAuto = (
    <IconWrapper bgClasses="bg-orange-100 border-t-2 border-b-2 border-solid border-gray-300">
      <svg viewBox="0 0 25 25" width="20" height="20" aria-hidden="true">
        <path fill="#3a3a3a" d="M19.86,2.99h-.36c-.6,0-1.08.49-1.08,1.08s.49,1.08,1.08,1.08h.36c.4,0,.72.33.72.72v13.24c0,.4-.32.72-.72.72h-8.93v-1.42c0-.51-.64-.74-.96-.34l-1.92,2.33c-.27.33-.27.81,0,1.15l1.92,2.33c.32.39.96.16.96-.34v-1.54h8.93c1.6,0,2.89-1.29,2.89-2.89V5.88c0-1.6-1.29-2.89-2.89-2.89Z"/>
        <path fill="#3a3a3a" d="M5.5,19.84h-.36c-.4,0-.72-.33-.72-.72V5.88c0-.4.32-.72.72-.72h8.93v1.42c0,.51.64.74.96.34l1.92-2.33c.27-.33.27-.81,0-1.15l-1.92-2.33c-.32-.39-.96-.16-.96.34v1.54H5.14c-1.6,0-2.89,1.29-2.89,2.89v13.24c0,1.6,1.29,2.89,2.89,2.89h.36c.6,0,1.08-.49,1.08-1.08s-.49-1.08-1.08-1.08Z"/>
        <path fill="#3a3a3a" d="M12.5,8.24c-.42,0-.8.24-.98.62l-3.02,6.31c-.26.54-.03,1.19.51,1.45.15.07.31.11.47.11.4,0,.79-.23.98-.62l.61-1.28h2.86l.61,1.28c.26.54.91.77,1.45.51.54-.26.77-.91.51-1.45l-3.02-6.31c-.18-.38-.56-.62-.98-.62ZM11.76,13.37l.74-1.54.74,1.54h-1.47Z"/>
      </svg>
    </IconWrapper>
  );
  const IconPending = (
    <IconWrapper bgClasses="bg-yellow-100 border-t-2 border-b-2 border-solid border-gray-300">
      <svg viewBox="0 0 25 25" width="20" height="20" aria-hidden="true">
        <path fill="#3a3a3a" d="M11,7.36c-.6,0-1.08.49-1.08,1.08v4.55c0,.35.17.68.46.89l2.87,2.02c.19.13.41.2.62.2.34,0,.68-.16.89-.46.34-.49.23-1.17-.26-1.51l-2.41-1.69v-3.99c0-.6-.49-1.08-1.08-1.08Z"/>
        <path fill="#3a3a3a" d="M23.24,9h-1.53v-3.12c0-1.6-1.3-2.89-2.89-2.89H4.1c-1.6,0-2.89,1.29-2.89,2.89v13.24c0,1.6,1.29,2.89,2.89,2.89h2.07c.6,0,1.08-.48,1.08-1.08s-.48-1.08-1.08-1.08h-2.07c-.4,0-.72-.33-.72-.72V5.88c0-.4.33-.72.72-.72h14.72c.4,0,.72.33.72.72v3.12h-1.42c-.51,0-.74.64-.35.96l1.77,1.45.56.46c.33.27.82.27,1.15,0l.46-.38,1.88-1.54c.39-.33.16-.96-.35-.96Z"/>
        <circle fill="#3a3a3a" cx="13.4" cy="20.92" r="1.08"/>
        <circle fill="#3a3a3a" cx="17.02" cy="20.92" r="1.08"/>
        <circle fill="#3a3a3a" cx="9.79" cy="20.92" r="1.08"/>
      </svg>
    </IconWrapper>
  );
  const IconCleared = (
    <IconWrapper bgClasses="bg-green-100 rounded-r-2xl border-t-2 border-r-2 border-b-2 border-solid border-gray-300">
      <svg viewBox="0 0 25 25" width="20" height="20" aria-hidden="true">
        <path fill="#3a3a3a" d="M19.86,2.99H5.14c-1.6,0-2.89,1.29-2.89,2.89v13.24c0,1.6,1.29,2.89,2.89,2.89h14.71c1.6,0,2.89-1.29,2.89-2.89V5.88c0-1.6-1.29-2.89-2.89-2.89ZM20.58,19.12c0,.4-.33.72-.72.72H5.14c-.4,0-.72-.32-.72-.72V5.88c0-.4.33-.72.72-.72h14.71c.4,0,.72.33.72.72v13.24Z"/>
        <path fill="#3a3a3a" d="M16.2,8.58c-.49-.35-1.17-.23-1.51 .26l-3.22 4.56-1.15-1.49c-.37-.47-1.05-.56-1.52-.2-.47 .37-.56 1.05-.2 1.52l2.05 2.66c.21 .27 .52 .42 .86 .42 0 0 .01 0 .02 0 .34 0 .66-.18 .86-.46l4.07-5.76c.35-.49 .23-1.17-.26-1.51Z"/>
      </svg>
    </IconWrapper>
  );

  // ---------- Render ----------
  const pos = currentBalance >= 0;
  const balanceCard = (
    <div className={`rounded-2xl p-4 text-center text-white ${pos ? "bg-green-600" : "bg-red-600"}`}>
      <div className="text-sm opacity-90">Current Balance</div>
      <div className="text-3xl font-bold mt-1">{usd(currentBalance)}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 select-none">
      {/* Pinned Search */}
      <div className="sticky top-0 bg-gray-50 py-2 shadow z-20">
        <div className="max-w-md mx-auto px-4">
          <input
            className="w-full rounded-xl border border-gray-300 border-solid px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by name or amount"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Balance */}
      <div className="max-w-md mx-auto mt-3 px-4">{balanceCard}</div>

      {/* Confirm Clear Modal */}
      {confirmClear && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={overlayStyle} role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-lg w-80 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Clear All Transactions?</h2>
              <button onClick={() => setConfirmClear(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
            </div>
            <div className="px-6 py-4 text-sm text-gray-700">
              <div>This will remove all transactions and reset your balance.</div>
              <div className="mt-1 text-xs text-gray-500">This only affects this device.</div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button onClick={() => setConfirmClear(false)} className="flex-1 rounded-xl bg-gray-200 px-4 py-2 font-medium hover:bg-gray-300">Cancel</button>
              <button onClick={clearAll} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmTx && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={overlayStyle} role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-lg w-80 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Delete Transaction?</h2>
              <button onClick={() => setConfirmTx(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
            </div>
            <div className="px-6 py-4 text-sm text-gray-700">
              <div className="font-semibold">{confirmTx.name}</div>
              <div className="mb-2">{usd(confirmTx.amount)}</div>
              <div>Are you sure you want to permanently delete this transaction?</div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button onClick={() => setConfirmTx(null)} className="flex-1 rounded-xl bg-gray-200 px-4 py-2 font-medium hover:bg-gray-300">Cancel</button>
              <button onClick={() => removeTransaction(confirmTx.id)} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-30" style={overlayStyle} role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-0 shadow-lg w-[420px] max-w-[90vw] overflow-hidden">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold">{editTx ? "Edit Transaction" : "Add Transaction"}</h2>
                {editTx && (
                  <p className="text-xs text-gray-500">Update the transaction details and select Credit or Debit to save changes.</p>
                )}
              </div>
              <button onClick={() => { setShowForm(false); setEditTx(null); }} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
            </div>

            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Name</label>
                <input
                  className="w-full rounded-xl border border-gray-300 border-solid px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Name"
                  value={txName}
                  onChange={(e) => setTxName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 rounded-xl border border-gray-300 border-solid bg-gray-50 select-none">$</span>
                  <input
                    className="flex-1 rounded-xl border border-gray-300 border-solid px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                <div className="flex gap-3">
                  <button onClick={() => addTransactionWithSign("credit")} className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 active:scale-95">{editTx ? "Save Credit" : "Credit"}</button>
                  <button onClick={() => addTransactionWithSign("debit")} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 active:scale-95">{editTx ? "Save Debit" : "Debit"}</button>
                </div>
              </div>

              {editTx && (
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <button onClick={() => setConfirmTx(editTx)} className="w-full rounded-xl bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700">Delete Transaction</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="max-w-md mx-auto mt-3 px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <button onClick={() => setConfirmClear(true)} className="text-sm text-red-600 hover:underline">Clear</button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-gray-500">No transactions yet. Add one using the + button.</div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((tx) => {
              const running = runningBalancesMap.get(tx.id) ?? 0;
              const offset = swipe.id === tx.id ? swipe.dx : swipe.openId === tx.id ? -REVEAL : 0;

              return (
                <li key={tx.id} className="relative">
                  {/* solid border underlay */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-solid border-gray-300 pointer-events-none" />

                  {/* right anchored status panel */}
                  <div className="absolute inset-y-0 right-0 w-[160px] grid grid-cols-4 items-center justify-items-center">
                    <button title="Scheduled" onClick={() => updateStatus(tx.id, "Scheduled")} className="w-full h-full flex items-center justify-center">{IconScheduled}</button>
                    <button title="Auto" onClick={() => updateStatus(tx.id, "Auto")} className="w-full h-full flex items-center justify-center">{IconAuto}</button>
                    <button title="Pending" onClick={() => updateStatus(tx.id, "Pending")} className="w-full h-full flex items-center justify-center">{IconPending}</button>
                    <button title="Cleared" onClick={() => updateStatus(tx.id, "Cleared")} className="w-full h-full flex items-center justify-center">{IconCleared}</button>
                  </div>

                  {/* foreground card */}
                  <div
                    className={`relative ${txBg(tx.status)} p-4 shadow-sm border rounded-2xl bg-clip-padding`}
                    style={{ transform: `translateX(${offset}px)`, transition: swipe.id === tx.id ? "none" : "transform 160ms ease" }}
                    onPointerDown={(e) => handlePointerDown(e, tx.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onTouchStart={(e) => handlePointerDown(e, tx.id)}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                  >
                    <div className="flex items-start justify-between">
                      <button onClick={() => startEdit(tx)} className="font-semibold text-gray-900 text-left hover:underline" aria-label="Edit this transaction">{tx.name}</button>
                      <div className="font-semibold">{usd(tx.amount * tx.sign)}</div>
                    </div>
                    <div className="mt-1 flex items-end justify-between text-xs text-gray-600">
                      <div>{formatDate(tx.createdAt)}</div>
                      <div>Balance: {usd(running)}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={startAdd}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl hover:bg-indigo-700 active:scale-95 z-10"
        aria-label="Add transaction"
      >
        +
      </button>
      <InstallBanner />
    </div>
  );
}
