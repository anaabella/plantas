export type AcquisitionType = 'purchased' | 'gifted' | 'traded';

export interface Plant {
  id: string;
  name: string;
  imageUrl: string;
  imageHint: string;
  acquisitionDate: Date;
  acquisitionType: AcquisitionType;
  price?: number;
  tradeReason?: string;
  rootInfo?: string;
  leafInfo?: string;
  clippingInfo?: string;
  isDeceased: boolean;
}
