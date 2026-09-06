/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
  const discountRatio = 1 - discount / 100;
  const revenue = sale_price * quantity * discountRatio;

  return revenue;
  // @TODO: Расчет выручки от операции
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  let bonus;
  if (index === 0) {
    return (bonus = (profit / 100) * 15);
  } else if (index === 1 || index === 2) {
    return (bonus = (profit / 100) * 10);
  } else if (index === total - 1) {
    return 0;
  } else {
    return (bonus = (profit / 100) * 5);
  }
}
// @TODO: Расчет бонуса от позиции в рейтинге

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    !Array.isArray(data.customers) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0 ||
    data.customers.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }
  // @TODO: Проверка наличия опций
  if (typeof options !== "object" || options === null) {
    throw new Error("Опции должны быть объектом");
  }

  const { calculateRevenue, calculateBonus } = options;
  // @TODO: Проверка наличия опций
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error(
      "Опции должны содержать функции calculateRevenue и calculateBonus",
    );
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    top_products: [],
    bonus: 0,
  }));

  //@TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.seller_id, seller]),
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product]),
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;
    seller.sales_count = (seller.sales_count || 0) + 1;
    seller.revenue = (seller.revenue || 0) + record.total_amount;
    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) {
        console.warn(`Товар с SKU ${item.sku} не найден`);
        return;
      }
      let cost = product.purchase_price * item.quantity;
      let revenue = calculateSimpleRevenue(item, product);
      seller.profit = (seller.profit || 0) + (revenue - cost);
      if (!seller.products_sold) {
        seller.products_sold = {};
      }
      seller.products_sold[item.sku] =
        (seller.products_sold[item.sku] || 0) + item.quantity;
    });
  });

  // @TODO: Сортируем продавцов по прибыли
  sellerStats.sort((a, b) => {
    if (a.profit < b.profit) {
      return 1;
    }
    if (a.profit > b.profit) {
      return -1;
    }
    return 0;
  });
  //@TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
    seller.top_products = Object.entries(seller.products_sold || {})
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +(seller.revenue || 0).toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +(seller.profit || 0).toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +(seller.bonus || 0).toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}
