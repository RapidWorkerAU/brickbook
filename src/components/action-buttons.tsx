"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { IconCheck, IconTrash } from "@tabler/icons-react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function LoadingButton({ loading = false, disabled, children, className = "", ...props }: LoadingButtonProps) {
  return (
    <button className={className} disabled={disabled || loading} {...props}>
      {loading ? <span className="btn-loading-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type ConfirmDeleteButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  iconOnly?: boolean;
  label?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDeleteButton({
  iconOnly = false,
  label = "Delete",
  confirmLabel = "Confirm",
  className = "",
  disabled,
  onConfirm,
  ...props
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const baseClass = iconOnly ? "btn-icon btn-icon-compact btn-icon-danger" : "btn btn-danger btn-sm";
  const confirmClass = iconOnly ? "btn-icon-danger-confirm" : "btn-danger-confirm";

  const handleClick = async () => {
    if (loading) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingButton
      className={`${baseClass} ${confirming ? confirmClass : ""} ${className}`.trim()}
      disabled={disabled}
      loading={loading}
      onBlur={() => {
        if (!loading) setConfirming(false);
      }}
      onClick={handleClick}
      {...props}
    >
      {loading ? null : confirming ? <IconCheck size={13} /> : <IconTrash size={13} />}
      {iconOnly ? null : <span>{confirming ? confirmLabel : label}</span>}
    </LoadingButton>
  );
}
