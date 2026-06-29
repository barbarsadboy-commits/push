export const HARGA = {
  default: {
    vip: 25000,
    reseller: 50000,
    dev: 100000
  },
  ptpt: {
    early: {
      vip: 10000,
      reseller: 20000,
      dev: 30000
    },
    late: {
      vip: 15000,
      reseller: 25000,
      dev: 35000
    }
  },
  pajak: {
    resellerToVip: 3000,
    devToVip: 5000,
    devToReseller: 7000
  }
};

export function getUpgradePrice(targetRole: 'vip' | 'reseller' | 'dev', isRenewal: boolean, date: number): number {
  if (!isRenewal) {
    return HARGA.default[targetRole];
  } else {
    // Tgl 15 dan dibawahnya: early. Tgl 16 dan diatasnya: late.
    if (date <= 15) {
      return HARGA.ptpt.early[targetRole];
    } else {
      return HARGA.ptpt.late[targetRole];
    }
  }
}

export function getPajakPrice(actorRole: string, targetRole: string): number {
  if (actorRole === 'reseller' && targetRole === 'vip') return HARGA.pajak.resellerToVip;
  if (actorRole === 'dev' && targetRole === 'vip') return HARGA.pajak.devToVip;
  if (actorRole === 'dev' && targetRole === 'reseller') return HARGA.pajak.devToReseller;
  return 0;
}
