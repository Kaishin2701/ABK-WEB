/**
 * SKU Auto Generator Module
 * Tương tự logic hàm Excel LET để sinh mã sản phẩm biến thể
 */

const skuAuto = (() => {
  // Data config
  const config = {
    kidsSizes: ['16', '18', '20', '22', '24', '26', '28'],
    kidsLbls: ['(3-4 yrs)', '(4-5 yrs)', '(5-6 yrs)', '(7-8 yrs)', '(8-9 yrs)', '(10-11 yrs)', '(12-13 yrs)'],
    shirtSizes: ['S', 'M', 'L', 'XL', 'XXL']
  };

  /**
   * Sinh SKU dựa trên base product code
   * @param {string} baseCode - Mã sản phẩm cơ sở (VD: "SHIRT_ADK/KD")
   * @param {number} rowIndex - Số hàng (từ 1 trở lên)
   * @returns {string} - SKU biến thể
   */
  function generateSku(baseCode, rowIndex) {
    if (!baseCode || baseCode.trim() === '') {
      return '';
    }

    const n = rowIndex;

    // ADK/KD: 7 kids + 5 adult sizes
    if (baseCode.includes('ADK/KD')) {
      if (n <= 7) {
        return `${baseCode}_${config.kidsSizes[n - 1]} ${config.kidsLbls[n - 1]}`;
      } else if (n <= 12) {
        return `${baseCode}_${config.shirtSizes[n - 8]}`;
      }
      return '';
    }

    // KD: 7 kids sizes only
    if (baseCode.includes('KD') && !baseCode.includes('ADK')) {
      if (n <= 7) {
        return `${baseCode}_${config.kidsSizes[n - 1]} ${config.kidsLbls[n - 1]}`;
      }
      return '';
    }

    // AD: 5 adult sizes only
    if (baseCode.includes('AD')) {
      if (n <= 5) {
        return `${baseCode}_${config.shirtSizes[n - 1]}`;
      }
      return '';
    }

    return '';
  }

  /**
   * Sinh toàn bộ variants cho một base code
   * @param {string} baseCode - Mã sản phẩm cơ sở
   * @returns {Array} - Mảng tất cả SKU variants
   */
  function generateAllVariants(baseCode) {
    const variants = [];
    let maxRows = 0;

    if (baseCode.includes('ADK/KD')) {
      maxRows = 12;
    } else if (baseCode.includes('KD')) {
      maxRows = 7;
    } else if (baseCode.includes('AD')) {
      maxRows = 5;
    }

    for (let i = 1; i <= maxRows; i++) {
      const sku = generateSku(baseCode, i);
      if (sku) {
        variants.push(sku);
      }
    }

    return variants;
  }

  return {
    generateSku,
    generateAllVariants,
    getConfig: () => config
  };
})();

// Export cho Node.js hoặc browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = skuAuto;
}
