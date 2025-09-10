import React, { useCallback, useMemo, useState } from "react";
import QRCode from "qrcode";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig"; 

type FormData = {
  name: string;
  email: string;
  phone: string;
  confirmComing: boolean;
};

const initialData: FormData = {
  name: "",
  email: "",
  phone: "",
  confirmComing: false, 
};

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = (v: string) => /^[0-9+\-\s]{7,15}$/.test(v);

// Crypto-safe, short, URL-safe token
const makeToken = (len = 16) => {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const QRGenerator: React.FC = () => {
  const [data, setData] = useState<FormData>(initialData);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.name.trim()) e.name = "Name is required.";
    if (!data.email.trim()) e.email = "Email is required.";
    else if (!emailOk(data.email)) e.email = "Enter a valid email.";
    if (!data.phone.trim()) e.phone = "Phone is required.";
    else if (!phoneOk(data.phone)) e.phone = "Enter a valid phone.";
    if (!data.confirmComing) e.confirmComing = "Please confirm if you're coming.";
    return e;
  }, [data]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      setData((d) => ({ ...d, [name]: type === "checkbox" ? checked : value }));
    },
    []
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
  }, []);

  const resetAll = useCallback(() => {
    setData(initialData);
    setQrUrl(null);
    setTouched({});
    setLastToken(null);
    setMessage(null);
    setEmailSending(false);
  }, []);

  // Function to send QR via email
  const sendQREmail = async (token: string, payload: any) => {
    try {
      setEmailSending(true);
      
      const response = await fetch('http://localhost:3001/api/send-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          token: token,
          qrData: payload
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage("RSVP saved, QR generated, and email sent successfully! ✅");
      } else {
        setMessage("RSVP saved and QR generated, but email failed to send. ❌");
      }
    } catch (error) {
      console.error('Email API error:', error);
      setMessage("RSVP saved and QR generated, but email failed to send. ❌");
    } finally {
      setEmailSending(false);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTouched({ name: true, email: true, phone: true});
      setMessage(null);
      if (!isValid) return;

      try {
        setIsGenerating(true);

        // 1) Create token
        const token = makeToken(16);

        // 2) Save RSVP to Firestore
        const record = {
          t: "rsvp",
          token,
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          coming: data.confirmComing,
          status: "invited",
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "rsvps", token), record);

        // 3) Generate QR payload
        const payload = {
          t: "rsvp",
          token,
          name: record.name,
          email: record.email,
          phone: record.phone,
          coming: record.coming,
        };

        // 4) Generate QR for display
        const url = await QRCode.toDataURL(JSON.stringify(payload), {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
        });

        setQrUrl(url);
        setLastToken(token);
        
        // 5) Send QR via email
        await sendQREmail(token, payload);

      } catch (err) {
        console.error(err);
        setMessage("Failed to generate QR. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    },
    [data, isValid]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">RSVP • Generate QR</h1>
          <a
            href="/scan"
            className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Go to Scanner
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6">
            <h2 className="mb-4 text-lg font-medium">Guest Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-neutral-300">Name</label>
                <input
                  name="name"
                  value={data.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-white/25"
                  placeholder="John Doe"
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-300">Email</label>
                <input
                  name="email"
                  value={data.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  type="email"
                  className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-white/25"
                  placeholder="john@example.com"
                />
                {touched.email && errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-300">Phone</label>
                <input
                  name="phone"
                  value={data.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-white/25"
                  placeholder="+91 98765 43210"
                />
                {touched.phone && errors.phone && (
                  <p className="mt-1 text-xs text-red-400">{errors.phone}</p>
                )}
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="confirmComing"
                  name="confirmComing"
                  type="checkbox"
                  checked={data.confirmComing}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-neutral-950 text-neutral-200 focus:ring-0"
                />
                <label htmlFor="confirmComing" className="text-sm text-neutral-300">
                  I confirm I'm coming (Yes/No)
                </label>
              </div>
              {touched.confirmComing && errors.confirmComing && (
                <p className="text-xs text-red-400">{errors.confirmComing}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isGenerating || emailSending}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
                >
                  {isGenerating ? "Generating…" : emailSending ? "Sending Email…" : "Generate QR & Send Email"}
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
                >
                  Reset
                </button>
              </div>

              {message && (
                <div className="pt-2">
                  <p className={`text-sm ${
                    message.includes('✅') ? 'text-green-400' : 
                    message.includes('❌') ? 'text-yellow-400' : 
                    'text-neutral-300'
                  }`}>
                    {message}
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* QR Preview */}
          <div className="flex items-center justify-center">
            <div className="w-full rounded-2xl border border-white/10 bg-neutral-900/60 p-6 text-center">
              <h2 className="mb-4 text-lg font-medium">Your QR Code</h2>
              <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-neutral-950">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="RSVP QR Code"
                    className="m-6 h-auto max-h-[420px] w-auto max-w-[90%]"
                  />
                ) : (
                  <p className="px-6 text-sm text-neutral-400">
                    Fill the form and click <span className="text-neutral-200">Generate QR & Send Email</span>.
                  </p>
                )}
              </div>

              {qrUrl && (
                <>
                  <a
                    className="mt-4 inline-block rounded-lg border border-white/15 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
                    href={qrUrl}
                    download={`rsvp-${Date.now()}.png`}
                  >
                    Download PNG
                  </a>

                  <div className="mt-4 text-left text-xs text-neutral-300">
                    <div className="mb-2 font-semibold text-neutral-200">Token</div>
                    <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
                      <code className="break-all">{lastToken ?? "—"}</code>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-6 rounded-lg border border-white/10 bg-neutral-950 p-4 text-left text-xs text-neutral-300">
                <p className="mb-2 font-semibold text-neutral-200">What's encoded?</p>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(
                    {
                      t: "rsvp",
                      token: lastToken ?? "<generated on submit>",
                      name: data.name || "<name>",
                      email: data.email || "<email>",
                      phone: data.phone || "<phone>",
                      coming: data.confirmComing,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
              
              {emailSending && (
                <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                  <p className="text-sm text-blue-400">📧 Sending QR code to email...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          Tip: The QR code will be sent to your email and can be scanned for attendance.
        </p>
      </div>
    </div>
  );
};

export default QRGenerator;