#!/bin/bash
# Fix camelCase field names to match PostgreSQL lowercase columns
# This script updates HTML forms to use lowercase field names

echo "🔧 Fixing camelCase field names in HTML forms..."
echo ""

# Backup the file first
cp public/incident-form-page4.html public/incident-form-page4.html.backup
echo "✅ Created backup: public/incident-form-page4.html.backup"

# Fix additionalHazards → additionalhazards
sed -i '' 's/id="additionalHazards"/id="additionalhazards"/g' public/incident-form-page4.html
sed -i '' 's/name="additionalHazards"/name="additionalhazards"/g' public/incident-form-page4.html
sed -i '' "s/for=\"additionalHazards\"/for=\"additionalhazards\"/g" public/incident-form-page4.html
sed -i '' "s/getElementById('additionalHazards')/getElementById('additionalhazards')/g" public/incident-form-page4.html
echo "✅ Fixed: additionalHazards → additionalhazards"

# Fix nearestLandmark → nearestlandmark
sed -i '' 's/id="nearestLandmark"/id="nearestlandmark"/g' public/incident-form-page4.html
sed -i '' 's/name="nearestLandmark"/name="nearestlandmark"/g' public/incident-form-page4.html
sed -i '' "s/for=\"nearestLandmark\"/for=\"nearestlandmark\"/g" public/incident-form-page4.html
sed -i '' "s/getElementById('nearestLandmark')/getElementById('nearestlandmark')/g" public/incident-form-page4.html
echo "✅ Fixed: nearestLandmark → nearestlandmark"

# Fix junctionType → junctiontype
sed -i '' 's/id="junctionType"/id="junctiontype"/g' public/incident-form-page4.html
sed -i '' 's/name="junctionType"/name="junctiontype"/g' public/incident-form-page4.html
sed -i '' "s/for=\"junctionType\"/for=\"junctiontype\"/g" public/incident-form-page4.html
sed -i '' "s/getElementById('junctionType')/getElementById('junctiontype')/g" public/incident-form-page4.html
sed -i '' "s/junctionType === 'traffic_lights'/junctiontype === 'traffic_lights'/g" public/incident-form-page4.html
echo "✅ Fixed: junctionType → junctiontype"

# Fix junctionControl → junctioncontrol
sed -i '' 's/id="junctionControl"/id="junctioncontrol"/g' public/incident-form-page4.html
sed -i '' 's/name="junctionControl"/name="junctioncontrol"/g' public/incident-form-page4.html
sed -i '' "s/for=\"junctionControl\"/for=\"junctioncontrol\"/g" public/incident-form-page4.html
sed -i '' "s/getElementById('junctionControl')/getElementById('junctioncontrol')/g" public/incident-form-page4.html
echo "✅ Fixed: junctionControl → junctioncontrol"

# Fix trafficLightStatus → trafficlightstatus
sed -i '' 's/id="trafficLightStatus"/id="trafficlightstatus"/g' public/incident-form-page4.html
sed -i '' 's/name="trafficLightStatus"/name="trafficlightstatus"/g' public/incident-form-page4.html
sed -i '' "s/for=\"trafficLightStatus\"/for=\"trafficlightstatus\"/g" public/incident-form-page4.html
sed -i '' "s/getElementById('trafficLightStatus')/getElementById('trafficlightstatus')/g" public/incident-form-page4.html
sed -i '' "s/trafficLightStatusGroup/trafficlightstatusgroup/g" public/incident-form-page4.html
echo "✅ Fixed: trafficLightStatus → trafficlightstatus"

# Fix userManoeuvre → usermanoeuvre
sed -i '' 's/id="userManoeuvre"/id="usermanoeuvre"/g' public/incident-form-page4.html
sed -i '' 's/name="userManoeuvre"/name="usermanoeuvre"/g' public/incident-form-page4.html
sed -i '' "s/for=\"userManoeuvre\"/for=\"usermanoeuvre\"/g" public/incident-form-page4.html
sed -i '' "s/getElementById('userManoeuvre')/getElementById('usermanoeuvre')/g" public/incident-form-page4.html
echo "✅ Fixed: userManoeuvre → usermanoeuvre"

# Fix specialConditions → specialconditions
sed -i '' 's/name="specialConditions"/name="specialconditions"/g' public/incident-form-page4.html
sed -i '' "s/specialConditions\"/specialconditions\"/g" public/incident-form-page4.html
echo "✅ Fixed: specialConditions → specialconditions"

# Fix visibilityFactors → visibilityfactors
sed -i '' 's/name="visibilityFactors"/name="visibilityfactors"/g' public/incident-form-page4.html
sed -i '' "s/visibilityFactors\"/visibilityfactors\"/g" public/incident-form-page4.html
echo "✅ Fixed: visibilityFactors → visibilityfactors"

echo ""
echo "🎉 All camelCase fields fixed in incident-form-page4.html!"
echo ""
echo "Now fixing license_plate fields..."

# Fix license_plate → vehicle_license_plate in incident-form-page5-vehicle.html
cp public/incident-form-page5-vehicle.html public/incident-form-page5-vehicle.html.backup
sed -i '' 's/name="license_plate"/name="vehicle_license_plate"/g' public/incident-form-page5-vehicle.html
sed -i '' 's/id="license_plate"/id="vehicle_license_plate"/g' public/incident-form-page5-vehicle.html
sed -i '' "s/for=\"license_plate\"/for=\"vehicle_license_plate\"/g" public/incident-form-page5-vehicle.html
sed -i '' "s/getElementById('license_plate')/getElementById('vehicle_license_plate')/g" public/incident-form-page5-vehicle.html
echo "✅ Fixed: license_plate → vehicle_license_plate in incident-form-page5-vehicle.html"

echo ""
echo "✅ ALL FIXES COMPLETE!"
echo ""
echo "📝 Summary:"
echo "   • additionalHazards → additionalhazards"
echo "   • nearestLandmark → nearestlandmark"
echo "   • junctionType → junctiontype"
echo "   • junctionControl → junctioncontrol"
echo "   • trafficLightStatus → trafficlightstatus"
echo "   • userManoeuvre → usermanoeuvre"
echo "   • specialConditions → specialconditions"
echo "   • visibilityFactors → visibilityfactors"
echo "   • license_plate → vehicle_license_plate"
echo ""
echo "🔍 Next: Run validation to verify fixes"
echo "   node scripts/validate-postbox.js"
