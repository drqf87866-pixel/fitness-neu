$json = Get-Content "scripts/exercises-all.json" -Raw | ConvertFrom-Json

$mapping = @(
  @{ id = "ex_bankdruecken";        search = "Barbell Bench Press" }
  @{ id = "ex_schraegbank";         search = "Barbell Incline Bench Press" }
  @{ id = "ex_fliegende";           search = "Dumbbell Flyes" }
  @{ id = "ex_kabelueberzuege";     search = "Cable Crossover" }
  @{ id = "ex_dips";                search = "Dips - Chest Version" }
  @{ id = "ex_liegestuetze";        search = "Pushup" }
  @{ id = "ex_schulterdruecken";    search = "Dumbbell Shoulder Press" }
  @{ id = "ex_military_press";      search = "Barbell Shoulder Press" }
  @{ id = "ex_seitheben";           search = "Dumbbell Lateral Raise" }
  @{ id = "ex_frontheben";          search = "Dumbbell Front Raise" }
  @{ id = "ex_face_pulls";          search = "Face Pull" }
  @{ id = "ex_trizepsdruecken";     search = "Triceps Pushdown" }
  @{ id = "ex_overhead_triceps";    search = "Overhead Triceps" }
  @{ id = "ex_close_grip_bench";    search = "Close-Grip Barbell Bench Press" }
  @{ id = "ex_klimmzuege";          search = "Pullup" }
  @{ id = "ex_latzug";              search = "Wide-Grip Lat Pulldown" }
  @{ id = "ex_rudern_lh";           search = "Barbell Row" }
  @{ id = "ex_rudern_kabel";        search = "Cable Row" }
  @{ id = "ex_einarm_rudern";       search = "Dumbbell Row" }
  @{ id = "ex_kreuzheben";          search = "Barbell Deadlift" }
  @{ id = "ex_rdl";                 search = "Romanian Deadlift" }
  @{ id = "ex_shrugs";              search = "Dumbbell Shrug" }
  @{ id = "ex_bizepscurls";         search = "Barbell Curl" }
  @{ id = "ex_hammer_curls";        search = "Alternate Hammer Curl" }
  @{ id = "ex_sz_curls";            search = "EZ Bar Curl" }
  @{ id = "ex_kniebeugen";          search = "Barbell Full Squat" }
  @{ id = "ex_frontkniebeugen";     search = "Barbell Front Squat" }
  @{ id = "ex_goblet";              search = "Goblet Squat" }
  @{ id = "ex_beinpresse";          search = "Leg Press" }
  @{ id = "ex_ausfallschritte";     search = "Dumbbell Lunge" }
  @{ id = "ex_bulgarisch";          search = "Bulgarian Split Squat" }
  @{ id = "ex_beinstrecker";        search = "Leg Extension" }
  @{ id = "ex_beinbeuger";          search = "Leg Curl" }
  @{ id = "ex_hip_thrust";          search = "Hip Thrust" }
  @{ id = "ex_wadenheben";          search = "Standing Calf Raise" }
  @{ id = "ex_plank";               search = "Plank" }
  @{ id = "ex_crunches";            search = "Crunch" }
  @{ id = "ex_hanging_raises";      search = "Hanging Leg Raise" }
  @{ id = "ex_russian_twist";       search = "Russian Twist" }
  @{ id = "ex_pallof";              search = "Pallof Press" }
  @{ id = "ex_ab_wheel";            search = "Ab Roller" }
  @{ id = "ex_laufband";            search = "Treadmill" }
  @{ id = "ex_rudern_cardio";       search = "Rowing" }
  @{ id = "ex_fahrrad";             search = "Bike" }
  @{ id = "ex_seilspringen";        search = "Jump Rope" }
)

$results = @()

foreach ($m in $mapping) {
  $match = $json | Where-Object { $_.name -like "*$($m.search)*" } | Select-Object -First 1
  if ($match) {
    $results += [PSCustomObject]@{
      Id = $m.id
      ExerciseName = $match.name
      Image0 = $match.images[0]
      Image1 = $match.images[1]
    }
    Write-Host "OK: $($m.id) -> $($match.name) ($($match.images[0]))"
  } else {
    Write-Host "MISS: $($m.id) ($($m.search) not found)"
  }
}

$results | ConvertTo-Json | Out-File "scripts/mapping.json" -Encoding utf8
Write-Host "`nMapping saved to scripts/mapping.json"
