import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LuCircleCheck } from "react-icons/lu";
import villageApi from "../api/villageApi";
import AuthLayout from "./layout/AuthLayout";
import { Alert, Button } from "./ui/kit";
import { field, label } from "./ui/classes";

const EMPTY = { village_name: "", team_name: "", admin_name: "", email_address: "", phone_number: "" };

const FIELDS = [
  { name: "village_name", label: "Village name", type: "text", placeholder: "e.g. Rampur", auto: "organization" },
  { name: "team_name", label: "Team name", type: "text", placeholder: "e.g. Rampur Warriors" },
  { name: "admin_name", label: "Your name (team admin)", type: "text", placeholder: "Full name", auto: "name" },
  { name: "email_address", label: "Email", type: "email", placeholder: "name@example.com", auto: "email" },
  { name: "phone_number", label: "Phone number", type: "tel", placeholder: "10-digit mobile number", auto: "tel" },
];

// A village asks to join the association. The association approves it and the team gets its login.
const Registration = () => {
  const [formData, setFormData] = useState(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await villageApi.registerVillage(formData);
      setSuccess(true);
      setFormData(EMPTY);
    } catch (err) {
      console.error("Error registering village:", err);
      setError("Could not send your request. Please check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Register your team"
      subtitle="Send a request to join the association. Once it is approved, your team admin receives a login."
      footer={
        <>
          Already approved?{" "}
          <Link to="/sign-in" className="font-semibold text-emerald-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {success ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <LuCircleCheck className="mx-auto h-9 w-9 text-slate-700" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Request sent</h2>
          <p className="mt-1 text-sm text-slate-600">The association will review it. You will be contacted on the email and phone you gave.</p>
          <Button variant="secondary" className="mt-5" onClick={() => setSuccess(false)}>
            Register another team
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label htmlFor={`reg-${f.name}`} className={label}>
                {f.label}
              </label>
              <input id={`reg-${f.name}`} name={f.name} type={f.type} autoComplete={f.auto} value={formData[f.name]} onChange={handleChange} className={field} placeholder={f.placeholder} required />
            </div>
          ))}
          <Button type="submit" size="lg" busy={isSubmitting} className="w-full">
            Send request
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default Registration;
