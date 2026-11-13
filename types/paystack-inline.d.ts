declare module "@paystack/inline-js" {
  interface PaystackCallbacks {
    onSuccess?: (tx: { reference: string; trans?: string; status?: string; message?: string }) => void;
    onCancel?: () => void;
    onError?: (err: { message: string }) => void;
    onLoad?: (res: unknown) => void;
  }
  export default class PaystackPop {
    constructor();
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): unknown;
  }
}
