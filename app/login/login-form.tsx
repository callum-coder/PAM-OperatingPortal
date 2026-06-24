"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { signInWithPassword, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signInWithPassword, initialState);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Email</span>
        <input
          className="portal-input"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Password</span>
        <input
          className="portal-input"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {state.error ? (
        <p className="border border-[#efb8b2] bg-[#fff4f2] px-3 py-2 text-sm text-[#9a241b]">
          {state.error}
        </p>
      ) : null}

      <button className="portal-primary-button" disabled={pending} type="submit">
        <LogIn size={18} />
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
