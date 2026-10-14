<?php

namespace Database\Seeders;

use App\Models\FraudRule;
use Illuminate\Database\Seeder;

class FraudRuleSeeder extends Seeder
{
    public function run(): void
    {
        $rules = [
            [
                'rule_name' => 'High Transaction Value Threshold',
                'rule_code' => 'TX_HIGH_VALUE',
                'description' => 'Flag single transactions greater than 1,000 AZN (or equivalent)',
                'rule_type' => 'threshold',
                'condition_operator' => '>',
                'threshold_value' => '1000.00',
                'risk_weight' => 35,
                'is_active' => true,
                'action' => 'step_up_2fa',
            ],
            [
                'rule_name' => 'Critical Transaction Value Threshold',
                'rule_code' => 'TX_CRITICAL_VALUE',
                'description' => 'Hold single transactions exceeding 5,000 AZN (or equivalent) for review',
                'rule_type' => 'threshold',
                'condition_operator' => '>',
                'threshold_value' => '5000.00',
                'risk_weight' => 75,
                'is_active' => true,
                'action' => 'hold',
            ],
            [
                'rule_name' => 'Rapid Velocity Transactions',
                'rule_code' => 'TX_HIGH_VELOCITY',
                'description' => 'Flag more than 5 transactions within a 10-minute window',
                'rule_type' => 'velocity',
                'condition_operator' => '>',
                'threshold_value' => '5',
                'risk_weight' => 45,
                'is_active' => true,
                'action' => 'flag',
            ],
            [
                'rule_name' => 'Unrecognized Device Login',
                'rule_code' => 'SEC_NEW_DEVICE',
                'description' => 'Challenge transaction originating from an untrusted or new device within 24 hours',
                'rule_type' => 'device',
                'condition_operator' => '==',
                'threshold_value' => 'untrusted',
                'risk_weight' => 25,
                'is_active' => true,
                'action' => 'flag',
            ],
            [
                'rule_name' => 'Repeated Failed Logins Before Transaction',
                'rule_code' => 'SEC_FAILED_LOGINS',
                'description' => 'Hold transactions after 3 or more failed login attempts in 1 hour',
                'rule_type' => 'pattern',
                'condition_operator' => '>=',
                'threshold_value' => '3',
                'risk_weight' => 60,
                'is_active' => true,
                'action' => 'hold',
            ],
        ];

        foreach ($rules as $rule) {
            FraudRule::updateOrCreate(['rule_code' => $rule['rule_code']], $rule);
        }
    }
}
