import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:csv/csv.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import 'package:location/location.dart';
import 'package:permission_handler/permission_handler.dart';

const String yieldBoxName = 'yield_data';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox(yieldBoxName);
  runApp(YieldEstimatorApp());
}

class YieldEstimatorApp extends StatelessWidget {
  const YieldEstimatorApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Yield Estimator',
        theme: ThemeData(
          useMaterial3: true,
          primaryColor: Color(0xFF8A3E2F),
          scaffoldBackgroundColor: Colors.white,
          colorScheme: ColorScheme.fromSeed(
            seedColor: Color(0xFF8A3E2F),
            primary: Color(0xFF8A3E2F),        // Cocoa brown
            secondary: Color(0xFF1D8A3F),      // Deep green
            surface: Colors.white,
            onPrimary: Colors.white,
            onSecondary: Colors.white,
          ),
          appBarTheme: AppBarTheme(
            backgroundColor: Color(0xFF8A3E2F),
            foregroundColor: Colors.white,
            centerTitle: true,
            elevation: 2,
            titleTextStyle: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              backgroundColor: Color(0xFF8A3E2F),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderSide: BorderSide(color: Color(0xFF8A3E2F), width: 2),
            ),
          ),
        ),


        home: YieldEstimatorPage(),
    );
  }
}

class YieldEstimatorPage extends StatefulWidget {
  const YieldEstimatorPage({super.key});

  @override
  _YieldEstimatorPageState createState() => _YieldEstimatorPageState();
}

class _YieldEstimatorPageState extends State<YieldEstimatorPage> {
  final _formKey = GlobalKey<FormState>();
  final _treeCountController = TextEditingController();
  final _podCountController = TextEditingController();
  final _certifiedAreaController = TextEditingController();
  final _lastYearProductionController = TextEditingController();
  final _idNumberController = TextEditingController();
  final _officerController = TextEditingController();
  final _locationController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  String _gpsLocation = 'Not set';

  final Map<String, bool> _conditions = {
    'Little or no pruning': false,
    'Lack of weeding': false,
    'High tree density': false,
    'Pest and disease effect': false,
    'Poor rainfall pattern': false,
  };

  String _result = '';

  double _adjustmentFactor() {
    return _conditions.values.where((v) => v).length * 0.05;
  }

  void _resetFields() {
    _idNumberController.clear();
    _officerController.clear();
    _locationController.clear();
    _certifiedAreaController.clear();
    _lastYearProductionController.clear();
    _treeCountController.clear();
    _podCountController.clear();
    _selectedDate = DateTime.now();
    _gpsLocation = 'Not set';
    _conditions.updateAll((key, value) => false);
  }

  Future<void> _fetchLocation() async {
    final permission = await Permission.location.request();
    if (permission.isGranted) {
      Location location = Location();
      bool serviceEnabled = await location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await location.requestService();
        if (!serviceEnabled) {
          setState(() => _gpsLocation = 'Location service disabled');
          return;
        }
      }

      final locData = await location.getLocation();
      setState(() {
        _gpsLocation = '${locData.latitude}, ${locData.longitude}';
      });
    } else {
      setState(() => _gpsLocation = 'Location permission denied');
    }
  }

  void _calculateYield() {
    final int treesInSample = int.tryParse(_treeCountController.text) ?? 0;
    final int totalPods = int.tryParse(_podCountController.text) ?? 0;

    final double area = double.tryParse(_certifiedAreaController.text) ?? 1;
    final double lastYearProduction = double.tryParse(
        _lastYearProductionController.text) ?? 0;
    final String idNumber = _idNumberController.text.trim();
    final String officerName = _officerController.text.trim();
    final String location = _locationController.text.trim();

    final double treeDensity = treesInSample * 100;
    final double podsPerTree = totalPods / treesInSample;
    final double beansPerTree = podsPerTree * 0.04;
    final double adjustmentPercentage = _adjustmentFactor() * 100;
    final double rawYieldPerHectare = beansPerTree * treeDensity;
    final double adjustedYieldPerHectare = rawYieldPerHectare *
        (1 - _adjustmentFactor());
    double estimatedVolume = adjustedYieldPerHectare * area;

    if (lastYearProduction > 0 && estimatedVolume > lastYearProduction * 1.3) {
      estimatedVolume = lastYearProduction * 1.3;
    }

    final record = {
      'idNumber': idNumber,
      'officer': officerName,
      'location': location,
      'treesInSample': treesInSample,
      'totalPods': totalPods,
      'area': area,
      'treeDensity': treeDensity,
      'podsPerTree': podsPerTree,
      'yieldPerHa': adjustedYieldPerHectare,
      'volume': estimatedVolume,
      'adjustmentPercentage': adjustmentPercentage,
      'lastYearProduction': lastYearProduction,
      'conditions': Map.from(_conditions),
      'timestamp': _selectedDate.toIso8601String(),
      'gps': _gpsLocation,
    };

    Hive.box(yieldBoxName).add(record);

    setState(() {
      _result = '''Tree Density: ${treeDensity.toStringAsFixed(1)} trees/ha\nAdjusted Yield/ha: ${adjustedYieldPerHectare.toStringAsFixed(2)} kg\nEstimated Volume: ${estimatedVolume.toStringAsFixed(2)} kg\nSaved Locally ✅''';
    });
    Future.delayed(Duration(seconds: 1), () {
      setState(() {
        _resetFields();
      });
    });
  }

  Widget buildCard(String title, Widget child) {
    return Card(
      elevation: 2,
      margin: EdgeInsets.symmetric(vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                    fontWeight: FontWeight.bold, color: Colors.brown)),
            SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Yield Estimator',
            style: Theme.of(context).textTheme.titleLarge),
        actions: [
          IconButton(
            icon: Icon(Icons.folder),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => SavedRecordsPage()),
              );
            },
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              buildCard("Farmer ID",
                TextFormField(
                  controller: _idNumberController,
                  keyboardType: TextInputType.text,
                  decoration: InputDecoration(hintText: 'Enter Farmer ID'),
                ),
              ),
              buildCard("Officer Name",
                TextFormField(
                  controller: _officerController,
                  keyboardType: TextInputType.name,
                  decoration: InputDecoration(hintText: 'Enter officer name'),
                ),
              ),
              buildCard("Society",
                TextFormField(
                  controller: _locationController,
                  keyboardType: TextInputType.text,
                  decoration: InputDecoration(hintText: 'Enter Society'),
                ),
              ),
              buildCard("Date of Estimate",
                InkWell(
                  onTap: () async {
                    DateTime? picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate,
                        firstDate: DateTime(2000),
                        lastDate: DateTime.now());
                    if (picked != null) {
                      setState(() => _selectedDate = picked);
                    }
                  },
                  child: InputDecorator(
                    decoration: InputDecoration(hintText: 'Select date'),
                    child: Text(DateFormat('yyyy-MM-dd').format(_selectedDate)),
                  ),
                ),
              ),
              buildCard("1. Productive trees in 10x10m sample area",
                TextFormField(
                  controller: _treeCountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(hintText: 'Enter number of trees'),
                ),
              ),
              buildCard("2. Total pods counted on sampled trees",
                TextFormField(
                  controller: _podCountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(hintText: 'Enter total pod count'),
                ),
              ),
              buildCard("3. Certified farm area (hectares)",
                TextFormField(
                  controller: _certifiedAreaController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(hintText: 'Enter area in hectares'),
                ),
              ),
              buildCard("4. Cocoa produced last year (kg)",
                TextFormField(
                  controller: _lastYearProductionController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(hintText: "Enter previous year's production"),
                ),
              ),
              buildCard("5. Local Conditions (tick if applicable)",
                Column(
                  children: _conditions.keys.map((key) {
                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text(key)),
                        Switch.adaptive(
                          value: _conditions[key]!,
                          onChanged: (val) {
                            setState(() {
                              _conditions[key] = val;
                            });
                          },
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
              buildCard("GPS Location",
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_gpsLocation),
                    ElevatedButton.icon(
                      icon: Icon(Icons.location_on),
                      label: Text('Get Location'),
                      onPressed: _fetchLocation,
                    ),
                  ],
                ),
              ),
              FilledButton(
                onPressed: _calculateYield,
                child: Text('Estimate Yield'),
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              SizedBox(height: 20),
              if (_result.isNotEmpty)
                Card(
                  elevation: 3,
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(
                      _result,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        height: 1.4,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// SavedRecordsPage is assumed to be already defined after this
String generateCSV(List<Map<String, dynamic>> records) {
  List<List<dynamic>> rows = [
    ['Farmer ID', 'Officer', 'Society', 'Date', 'Yield/Ha', 'Volume', 'Adjustment %', 'GPS']
  ];

  for (final record in records) {
    rows.add([
      record['idNumber'] ?? '',
      record['officer'] ?? '',
      record['location'] ?? '',
      record['timestamp']?.substring(0, 10) ?? '',
      (record['yieldPerHa'] ?? 0).toStringAsFixed(2),
      (record['volume'] ?? 0).toStringAsFixed(2),
      (record['adjustmentPercentage'] ?? 0).toStringAsFixed(0) + '%',
      record['gps'] ?? '',
    ]);
  }



  return const ListToCsvConverter().convert(rows);
}
class SavedRecordsPage extends StatefulWidget {
  const SavedRecordsPage({super.key});

  @override
  _SavedRecordsPageState createState() => _SavedRecordsPageState();
}

class _SavedRecordsPageState extends State<SavedRecordsPage> {
  Box<dynamic> yieldBox = Hive.box(yieldBoxName);
  Set<int> selectedIndices = {};
  bool selectionMode = false;

  void selectAll() {
    setState(() {
      selectedIndices = Set.from(List.generate(yieldBox.length, (i) => i));
      selectionMode = true;
    });
  }





  void toggleSelection(int index) {
    setState(() {
      if (selectedIndices.contains(index)) {
        selectedIndices.remove(index);
        if (selectedIndices.isEmpty) selectionMode = false;
      } else {
        selectedIndices.add(index);
        selectionMode = true;
      }
    });
  }

  void clearSelection() {
    setState(() {
      selectedIndices.clear();
      selectionMode = false;
    });
  }

  void exportCSV() async {
    List<List<dynamic>> rows = [
      ['Farmer ID', 'Officer', 'Society', 'Date', 'Yield/Ha', 'Volume', 'GPS', 'Adjustment %']
    ];

    for (int index in selectedIndices.isEmpty
        ? List.generate(yieldBox.length, (i) => i)
        : selectedIndices) {
      final record = yieldBox.getAt(index);
      rows.add([
        record['idNumber'] ?? '',
        record['officer'] ?? '',
        record['location'] ?? '',
        record['timestamp'] ?? '',
        (record['yieldPerHa'] ?? 0).toStringAsFixed(2),
        (record['volume'] ?? 0).toStringAsFixed(2),
        record['gps'] ?? '',
        (record['adjustmentPercentage'] ?? 0).toStringAsFixed(0) + '%',
      ]);
    }

    final csv = const ListToCsvConverter().convert(rows);
    final dir = await getExternalStorageDirectory();
    final path = '${dir!.path}/yield_estimates.csv';
    final file = File(path);
    await file.writeAsString(csv);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('CSV saved to $path'),
    ));
  }

  void shareSelected() async {
    List<List<dynamic>> rows = [
      ['Farmer ID', 'Officer', 'Society', 'Date', 'Yield/Ha', 'Volume', 'GPS', 'Adjustment %']
    ];

    for (int index in selectedIndices.isEmpty
        ? List.generate(yieldBox.length, (i) => i)
        : selectedIndices) {
      final record = yieldBox.getAt(index);
      rows.add([
        record['idNumber'] ?? '',
        record['officer'] ?? '',
        record['location'] ?? '',
        record['timestamp'] ?? '',
        (record['yieldPerHa'] ?? 0).toStringAsFixed(2),
        (record['volume'] ?? 0).toStringAsFixed(2),
        record['gps'] ?? '',
        (record['adjustmentPercentage'] ?? 0).toStringAsFixed(0) + '%',
      ]);
    }

    final csv = const ListToCsvConverter().convert(rows);
    final dir = await getExternalStorageDirectory();
    final path = '${dir!.path}/yield_estimates_shared.csv';
    final file = File(path);
    await file.writeAsString(csv);

    await Share.shareXFiles(
      [XFile(path)],
      text: 'Yield Estimates CSV attached.',
      subject: 'Yield Estimates',
    );


  }

  void editRecord(int index) {
    final record = Map<String, dynamic>.from(yieldBox.getAt(index));

    final idController = TextEditingController(text: record['idNumber'] ?? '');
    final officerController = TextEditingController(text: record['officer'] ?? '');
    final locationController = TextEditingController(text: record['location'] ?? '');
    final areaController = TextEditingController(text: (record['area'] ?? '').toString());

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Edit Record'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: idController,
                decoration: InputDecoration(labelText: 'Farmer ID'),
                maxLength: 50,
              ),
              TextField(
                controller: officerController,
                decoration: InputDecoration(labelText: 'Officer Name'),
                maxLength: 50,
              ),
              TextField(
                controller: locationController,
                decoration: InputDecoration(labelText: 'Society'),
                maxLength: 50,
              ),
              TextField(
                controller: areaController,
                decoration: InputDecoration(labelText: 'Farm Size (ha)'),
                keyboardType: TextInputType.numberWithOptions(decimal: true),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              record['idNumber'] = idController.text.trim();
              record['officer'] = officerController.text.trim();
              record['location'] = locationController.text.trim();
              record['area'] = double.tryParse(areaController.text) ?? record['area'];

              yieldBox.putAt(index, record);
              Navigator.pop(context);
              setState(() {});
            },
            child: Text('Save'),
          ),
        ],
      ),
    );
  }

  void deleteAt(int index) {
    yieldBox.deleteAt(index);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: selectionMode ? Colors.brown[300] : null,
        title: Text(
          selectionMode ? '${selectedIndices.length} selected' : 'Saved Records',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
        ),
        actions: selectionMode
            ? [
          IconButton(
            icon: Icon(
              selectedIndices.length == yieldBox.length
                  ? Icons.check_box_outline_blank
                  : Icons.select_all,
            ),
            tooltip: selectedIndices.length == yieldBox.length
                ? 'Deselect All'
                : 'Select All',
            onPressed: () {
              if (selectedIndices.length == yieldBox.length) {
                clearSelection();
              } else {
                selectAll();
              }
            },
          ),
          IconButton(
            icon: Icon(Icons.download),
            tooltip: 'Export CSV',
            onPressed: exportCSV,
          ),
          IconButton(
            icon: Icon(Icons.share),
            tooltip: 'Share',
            onPressed: shareSelected,
          ),
          IconButton(
            icon: Icon(Icons.close),
            tooltip: 'Cancel Selection',
            onPressed: clearSelection,
          ),
        ]
            : [],

      ),
      body: ValueListenableBuilder(
        valueListenable: yieldBox.listenable(),
        builder: (context, Box box, _) {
          if (box.isEmpty) return Center(child: Text('No records found.'));
          return ListView.builder(
            itemCount: box.length,
            itemBuilder: (_, index) {
              final record = box.getAt(index);
              final selected = selectedIndices.contains(index);
              return Dismissible(
                key: Key(index.toString()),
                direction: DismissDirection.endToStart,
                background: Container(
                  alignment: Alignment.centerRight,
                  padding: EdgeInsets.only(right: 20),
                  color: Colors.red,
                  child: Icon(Icons.delete, color: Colors.white),
                ),
                onDismissed: (_) => deleteAt(index),
                child: GestureDetector(
                  onLongPress: () => toggleSelection(index),
                  onTap: () {
                    if (selectionMode) {
                      toggleSelection(index);
                    }
                  },
                  onDoubleTap: () {
                    if (!selectionMode) {
                      editRecord(index);
                    }
                  },

                  child: Card(
                    color: selected ? Colors.brown[100] : null,
                    child: ExpansionTile(
                      leading: selectionMode
                          ? Checkbox(
                              value: selected,
                              onChanged: (_) => toggleSelection(index),
                            )
                          : null,
                      title: Text('Farmer ID: ${record['idNumber'] ?? ''}'),
                      subtitle: Text('Officer: ${record['officer'] ?? ''}'),
                      children: [
                        ListTile(
                            title:
                                Text('Society: ${record['location'] ?? ''}')),
                        ListTile(
                            title: Text(
                                'Date: ${record['timestamp']?.substring(0, 10) ?? ''}')),
                        ListTile(
                            title: Text(
                                'Yield/Ha: ${record['yieldPerHa'].toStringAsFixed(2)} kg')),
                        ListTile(
                            title: Text(
                                'Volume: ${record['volume'].toStringAsFixed(2)} kg')),
                        ListTile(title: Text('GPS: ${record['gps'] ?? 'N/A'}')),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

