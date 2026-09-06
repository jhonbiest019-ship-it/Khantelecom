<?php
if (!defined('ABSPATH')) {
    exit;
}

class KT_Receipt_Engine {

    /**
     * Generate pre-formatted thermal slip text payload for WhatsApp link (Fee Collection)
     */
    public static function generate_whatsapp_message($invoice, $customer, $package, $collector_name = 'Staff Collector') {
        $customer_name = $customer['full_name'];
        $customer_code = $customer['customer_code'];
        $phone         = $customer['phone_number'];
        $area          = $customer['area_sector'];
        $amount_due    = number_format((float)$invoice['amount_due'], 2);
        $amount_paid   = number_format((float)$invoice['amount_paid'], 2);
        $speed         = $package ? $package['speed_mbps'] . ' Mbps' : 'Internet';
        $pkg_name      = $package ? $package['package_name'] : 'Internet Package';
        $month         = $invoice['billing_month'];
        $invoice_no    = $invoice['invoice_number'];
        $date_paid     = !empty($invoice['paid_at']) ? date('Y-m-d h:i A', strtotime($invoice['paid_at'])) : date('Y-m-d h:i A');
        $method        = strtoupper(str_replace('_', ' ', $invoice['payment_method']));

        $message = "⚡ *KHAN TELECOM* ⚡\n" .
                   "_HIGH-SPEED BROADBAND PROVIDER_\n" .
                   "----------------------------------\n" .
                   "*RECEIPT NO:* {$invoice_no}\n" .
                   "*DATE:* {$date_paid}\n" .
                   "*SUBSCRIBER ID:* {$customer_code}\n" .
                   "*NAME:* {$customer_name}\n" .
                   "*PHONE:* {$phone}\n" .
                   "*AREA:* {$area}\n" .
                   "----------------------------------\n" .
                   "*PACKAGE:* {$pkg_name}\n" .
                   "*BILLING MONTH:* {$month}\n" .
                   "*AMOUNT DUE:* PKR {$amount_due}\n" .
                   "*AMOUNT PAID:* PKR {$amount_paid}\n" .
                   "*PAYMENT METHOD:* {$method}\n" .
                   "*STATUS:* PAID ✅\n" .
                   "----------------------------------\n" .
                   "*COLLECTOR:* {$collector_name}\n" .
                   "==================================\n" .
                   "Thank you for choosing Khan Telecom!";

        return $message;
    }

    /**
     * Generate pre-formatted thermal slip text payload for WhatsApp link (Hardware Product Sale)
     */
    public static function generate_product_sale_whatsapp_message($sale, $customer, $product, $sold_by = 'Staff') {
        $customer_name = $customer['full_name'];
        $customer_code = $customer['customer_code'];
        $phone         = $customer['phone_number'];
        $area          = $customer['area_sector'];
        $sale_no       = 'SALE-' . str_pad($sale['id'], 4, '0', STR_PAD_LEFT);
        $date          = !empty($sale['date']) ? $sale['date'] : (!empty($sale['created_at']) ? date('Y-m-d h:i A', strtotime($sale['created_at'])) : date('Y-m-d h:i A'));
        $prod_name     = $product ? $product['product_name'] : (isset($sale['product_name']) ? $sale['product_name'] : 'Hardware Equipment');
        $qty           = isset($sale['quantity']) ? $sale['quantity'] : 1;
        $unit          = $product ? $product['unit'] : 'pcs';
        $unit_price    = number_format($product ? (float)$product['sale_price'] : ((float)$sale['total_sale'] / max(1, $qty)), 2);
        $total_paid    = number_format((float)$sale['total_sale'], 2);

        $message = "⚡ *KHAN TELECOM* ⚡\n" .
                   "_HARDWARE & EQUIPMENT RECEIPT_\n" .
                   "----------------------------------\n" .
                   "*RECEIPT NO:* {$sale_no}\n" .
                   "*DATE:* {$date}\n" .
                   "*SUBSCRIBER ID:* {$customer_code}\n" .
                   "*NAME:* {$customer_name}\n" .
                   "*PHONE:* {$phone}\n" .
                   "*AREA:* {$area}\n" .
                   "----------------------------------\n" .
                   "*ITEM:* {$prod_name}\n" .
                   "*QUANTITY:* {$qty} {$unit}\n" .
                   "*UNIT PRICE:* PKR {$unit_price}\n" .
                   "*TOTAL PAID:* PKR {$total_paid}\n" .
                   "*PAYMENT METHOD:* CASH SETTLEMENT\n" .
                   "*STATUS:* PAID ✅\n" .
                   "----------------------------------\n" .
                   "*SOLD BY:* {$sold_by}\n" .
                   "==================================\n" .
                   "Thank you for choosing Khan Telecom!";

        return $message;
    }

    /**
     * Build click-to-chat WhatsApp URL
     */
    public static function generate_whatsapp_url($phone_number, $message) {
        $clean_phone = preg_replace('/[^0-9]/', '', $phone_number);
        
        if (substr($clean_phone, 0, 1) === '0') {
            $clean_phone = '92' . substr($clean_phone, 1);
        }

        return 'https://wa.me/' . $clean_phone . '?text=' . rawurlencode($message);
    }

    /**
     * Render HTML thermal slip (80mm / 58mm layout) - Fee Collection
     */
    public static function render_thermal_slip_html($invoice, $customer, $package, $collector_name = 'Staff Collector') {
        $amount_paid = number_format((float)$invoice['amount_paid'], 2);
        $amount_due  = number_format((float)$invoice['amount_due'], 2);
        $discount    = number_format((float)$invoice['discount'], 2);
        $date_paid   = !empty($invoice['paid_at']) ? date('Y-m-d h:i A', strtotime($invoice['paid_at'])) : date('Y-m-d h:i A');

        ob_start();
        ?>
        <div class="kt-thermal-slip">
            <div class="slip-header">
                <h2>KHAN TELECOM</h2>
                <p class="slip-subtitle">HIGH-SPEED BROADBAND PROVIDER</p>
                <div class="slip-divider">--------------------------------</div>
            </div>

            <div class="slip-body">
                <div class="slip-row"><span>Invoice No:</span> <strong><?php echo esc_html($invoice['invoice_number']); ?></strong></div>
                <div class="slip-row"><span>Date:</span> <span><?php echo esc_html($date_paid); ?></span></div>
                <div class="slip-row"><span>Customer ID:</span> <strong><?php echo esc_html($customer['customer_code']); ?></strong></div>
                <div class="slip-row"><span>Customer Name:</span> <span><?php echo esc_html($customer['full_name']); ?></span></div>
                <div class="slip-row"><span>Phone:</span> <span><?php echo esc_html($customer['phone_number']); ?></span></div>
                <div class="slip-row"><span>Area/Sector:</span> <span><?php echo esc_html($customer['area_sector']); ?></span></div>

                <div class="slip-divider">--------------------------------</div>
                <div class="slip-row"><span>Package:</span> <strong><?php echo esc_html($package ? $package['package_name'] : 'N/A'); ?></strong></div>
                <div class="slip-row"><span>Billing Month:</span> <span><?php echo esc_html($invoice['billing_month']); ?></span></div>
                <div class="slip-row"><span>Amount Due:</span> <span>PKR <?php echo $amount_due; ?></span></div>
                <?php if ((float)$invoice['discount'] > 0): ?>
                <div class="slip-row"><span>Discount:</span> <span>PKR <?php echo $discount; ?></span></div>
                <?php endif; ?>
                <div class="slip-row slip-total"><span>Amount Paid:</span> <strong>PKR <?php echo $amount_paid; ?></strong></div>
                <div class="slip-row"><span>Payment Method:</span> <span><?php echo esc_html(strtoupper(str_replace('_', ' ', $invoice['payment_method']))); ?></span></div>
                <div class="slip-row"><span>Status:</span> <strong class="badge-paid">PAID</strong></div>
                <div class="slip-divider">--------------------------------</div>
                <div class="slip-row"><span>Collector:</span> <span><?php echo esc_html($collector_name); ?></span></div>
            </div>

            <div class="slip-footer">
                <p>Thank you for choosing Khan Telecom!</p>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render HTML thermal slip (80mm / 58mm layout) - Product Sale
     */
    public static function render_product_sale_thermal_slip_html($sale, $customer, $product, $sold_by = 'Staff') {
        $sale_no    = 'SALE-' . str_pad($sale['id'], 4, '0', STR_PAD_LEFT);
        $date       = !empty($sale['date']) ? $sale['date'] : (!empty($sale['created_at']) ? date('Y-m-d h:i A', strtotime($sale['created_at'])) : date('Y-m-d h:i A'));
        $prod_name  = $product ? $product['product_name'] : (isset($sale['product_name']) ? $sale['product_name'] : 'Hardware Equipment');
        $qty        = isset($sale['quantity']) ? $sale['quantity'] : 1;
        $unit       = $product ? $product['unit'] : 'pcs';
        $unit_price = number_format($product ? (float)$product['sale_price'] : ((float)$sale['total_sale'] / max(1, $qty)), 2);
        $total_paid = number_format((float)$sale['total_sale'], 2);

        ob_start();
        ?>
        <div class="kt-thermal-slip">
            <div class="slip-header">
                <h2>KHAN TELECOM</h2>
                <p class="slip-subtitle">HARDWARE & EQUIPMENT RECEIPT</p>
                <div class="slip-divider">--------------------------------</div>
            </div>

            <div class="slip-body">
                <div class="slip-row"><span>Receipt No:</span> <strong><?php echo esc_html($sale_no); ?></strong></div>
                <div class="slip-row"><span>Date:</span> <span><?php echo esc_html($date); ?></span></div>
                <div class="slip-row"><span>Customer ID:</span> <strong><?php echo esc_html($customer['customer_code']); ?></strong></div>
                <div class="slip-row"><span>Customer Name:</span> <span><?php echo esc_html($customer['full_name']); ?></span></div>
                <div class="slip-row"><span>Phone:</span> <span><?php echo esc_html($customer['phone_number']); ?></span></div>
                <div class="slip-row"><span>Area/Sector:</span> <span><?php echo esc_html($customer['area_sector']); ?></span></div>

                <div class="slip-divider">--------------------------------</div>
                <div class="slip-row"><span>Item:</span> <strong><?php echo esc_html($prod_name); ?></strong></div>
                <div class="slip-row"><span>Qty:</span> <span><?php echo esc_html($qty . ' ' . $unit); ?></span></div>
                <div class="slip-row"><span>Unit Price:</span> <span>PKR <?php echo $unit_price; ?></span></div>
                <div class="slip-row slip-total"><span>Total Paid:</span> <strong>PKR <?php echo $total_paid; ?></strong></div>
                <div class="slip-row"><span>Payment Method:</span> <span>CASH SETTLEMENT</span></div>
                <div class="slip-row"><span>Status:</span> <strong class="badge-paid">PAID</strong></div>
                <div class="slip-divider">--------------------------------</div>
                <div class="slip-row"><span>Sold By:</span> <span><?php echo esc_html($sold_by); ?></span></div>
            </div>

            <div class="slip-footer">
                <p>Thank you for choosing Khan Telecom!</p>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

