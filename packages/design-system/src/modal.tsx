import * as React from "react";
import { Button } from "./button";

type ModalProps = {
  children: React.ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function Modal({ children, description, isOpen, onClose, title }: ModalProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousActive = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousActive?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="ds-overlay" role="presentation" onClick={onClose}>
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="ds-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ds-modal-header">
          <div>
            <h2 className="ds-modal-title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="ds-help" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <Button
            ref={closeButtonRef}
            aria-label="Close dialog"
            className="ds-modal-close"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
        <div className="ds-modal-body">{children}</div>
      </div>
    </div>
  );
}
