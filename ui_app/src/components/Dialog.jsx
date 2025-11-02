// NOTA: La mayoría del código de este componente fue extraido de la pag: https://www.radix-ui.com/primitives/docs/components/alert-dialog

import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

const ANIMATION_CLASSES = {
    overlay: "fixed inset-0 bg-black/25 z-10 data-[state=open]:animate-[overlayShow_150ms] data-[state=closed]:animate-[overlayHide_150ms]",
    content: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md max-h-[85vh] p-6 bg-gray-50 rounded-md shadow-lg z-20 focus:outline-none data-[state=open]:animate-[contentShow_150ms] data-[state=closed]:animate-[contentHide_150ms]",
};

const Dialog = ({
    type = "confirm",   // "confirm" | "info"
    open,               // boolean -> controlar apertura externa
    onOpenChange,       // callback para abrir/cerrar
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    trigger = null,      // elemento opcional que abre el dialog (puede ser null)
    okLabel = "OK",      // solo para type="info"
}) => {

    const baseButtonClasses = "inline-flex items-center justify-center h-[35px] px-[15px] text-[15px] font-semibold rounded-[4px] select-none cursor-pointer transition-colors duration-200 ease-in-out";
    const cancelButtonClasses =
        `${baseButtonClasses} border-2 border-[#2449FF] text-[#2449FF]
        hover:border-[#1C3A8D] hover:bg-[#1C3A8D] hover:text-white`;

    const confirmButtonClasses =
        `${baseButtonClasses} border-2 border-[#2449FF] bg-[#2449FF] text-white
        hover:border-[#1C3A8D] hover:bg-[#1C3A8D]`;

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}

            <AlertDialog.Portal>
                <AlertDialog.Overlay className={ANIMATION_CLASSES.overlay} />
                <AlertDialog.Content className={ANIMATION_CLASSES.content}>
                    <AlertDialog.Title className="m-0 text-[18px] font-semibold text-black">
                        {title}
                    </AlertDialog.Title>

                    <AlertDialog.Description className="mb-5 text-[15px] leading-relaxed text-gray-700">
                        {description}
                    </AlertDialog.Description>

                    <div className="flex justify-end gap-6">
                        {type === "confirm" ? (
                        <>
                            <AlertDialog.Cancel asChild>
                                <button className={cancelButtonClasses}>
                                    {cancelLabel}
                                </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button className={confirmButtonClasses} onClick={onConfirm}>
                                    {confirmLabel}
                                </button>
                            </AlertDialog.Action>
                        </>
                        ) : (
                        <AlertDialog.Cancel asChild>
                            <button className={confirmButtonClasses} onClick={() => onOpenChange(false)}>
                                {okLabel}
                            </button>
                        </AlertDialog.Cancel>
                        )}
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
};

export default Dialog;