<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('china:sync')->hourly()->withoutOverlapping();
