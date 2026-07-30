// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _modal: any = null;

export function setModal(modal: typeof _modal) {
  _modal = modal;
}

export async function openConnectModal() {
  if (_modal) await _modal.open({ view: "Connect" });
}
