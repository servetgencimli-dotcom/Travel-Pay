<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Hotels', 'icon' => 'hotel', 'color' => '#3B82F6', 'is_default' => true],
            ['name' => 'Restaurants', 'icon' => 'restaurant', 'color' => '#F59E0B', 'is_default' => true],
            ['name' => 'Transportation', 'icon' => 'directions_transit', 'color' => '#10B981', 'is_default' => true],
            ['name' => 'Museums', 'icon' => 'museum', 'color' => '#8B5CF6', 'is_default' => true],
            ['name' => 'Shopping', 'icon' => 'shopping_bag', 'color' => '#EC4899', 'is_default' => true],
            ['name' => 'Entertainment', 'icon' => 'theater_comedy', 'color' => '#06B6D4', 'is_default' => true],
            ['name' => 'Other', 'icon' => 'more_horiz', 'color' => '#6B7280', 'is_default' => true],
        ];

        foreach ($categories as $cat) {
            ExpenseCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }
    }
}
