class Finance {
  static double profit({required double cost, required double price}) => price - cost;

  static double margin({required double cost, required double price}) {
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  }

  static double discountPrice({required double price, required double discountPercent}) {
    final discount = discountPercent.clamp(0, 100).toDouble();
    return price * (1 - discount / 100);
  }

  static double commission({required double sale, required double ratePercent}) =>
      sale * ratePercent.clamp(0, 100).toDouble() / 100;

  static double installment({required double total, required int count}) =>
      count <= 0 ? 0 : total / count;
}
