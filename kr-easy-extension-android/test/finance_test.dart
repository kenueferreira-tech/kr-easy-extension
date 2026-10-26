import 'package:flutter_test/flutter_test.dart';
import 'package:kr_easy_extension/finance.dart';

void main() {
  test('calculates profit and margin from real values', () {
    expect(Finance.profit(cost: 60, price: 100), 40);
    expect(Finance.margin(cost: 60, price: 100), 40);
  });

  test('discount and commission are bounded to 0..100 percent', () {
    expect(Finance.discountPrice(price: 100, discountPercent: 10), 90);
    expect(Finance.discountPrice(price: 100, discountPercent: 120), 0);
    expect(Finance.commission(sale: 200, ratePercent: 5), 10);
  });

  test('installments handle zero count safely', () {
    expect(Finance.installment(total: 120, count: 3), 40);
    expect(Finance.installment(total: 120, count: 0), 0);
  });
}
