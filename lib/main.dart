import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:csv/csv.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';

const String yieldBoxName = 'yield_data';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox(yieldBoxName);
  runApp(YieldEstimatorApp());
}

class YieldEstimatorApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Yield Estimator',
      theme: ThemeData(
        primarySwatch: Colors.brown,
        scaffoldBackgroundColor: Colors.grey[100],
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      home: YieldEstimatorPage(),
    );
  }
}

class YieldEstimatorPage extends StatefulWidget {
  @override
  _YieldEstimatorPageState createState() => _YieldEstimatorPageState();
}

class _YieldEstimatorPageState extends State<YieldEstimatorPage> {
  final _formKey = GlobalKey<FormState>();
  final _treeCountController = TextEditingController();
  final _podCountController = TextEditingController();
  final _sampledTreesController = TextEditingController();
  final _certifiedAreaController = TextEditingController();
  final _lastYearProductionController = TextEditingController();
  final _idNumberController = TextEditingController();
  final _officerController = TextEditingController();
  final _locationController = TextEditingController();
  DateTime _selectedDate = DateTime.now();

  Map<String, bool> _conditions = {
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

  void _calculateYield() {
    final int treesInSample = int.tryParse(_treeCountController.text) ?? 0;
    final int totalPods = int.tryParse(_podCountController.text) ?? 0;
    final int sampledTrees = int.tryParse(_sampledTreesController.text) ?? 1;
    final double area = double.tryParse(_certifiedAreaController.text) ?? 1;
    final double lastYearProduction = double.tryParse(_lastYearProductionController.text) ?? 0;
    final String idNumber = _idNumberController.text.trim();
    final String officerName = _officerController.text.trim();
    final String location = _locationController.text.trim();

    final double treeDensity = treesInSample * 100;
    final double podsPerTree = totalPods / sampledTrees;
    final double beansPerTree = podsPerTree * 0.04;
    final double rawYieldPerHectare = beansPerTree * treeDensity;
    final double adjustedYieldPerHectare = rawYieldPerHectare * (1 - _adjustmentFactor());
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
      'sampledTrees': sampledTrees,
      'area': area,
      'treeDensity': treeDensity,
      'podsPerTree': podsPerTree,
      'yieldPerHa': adjustedYieldPerHectare,
      'volume': estimatedVolume,
      'lastYearProduction': lastYearProduction,
      'conditions': Map.from(_conditions),
      'timestamp': _selectedDate.toIso8601String(),
    };

    Hive.box(yieldBoxName).add(record);

    setState(() {
      _result = '''Tree Density: ${treeDensity.toStringAsFixed(1)} trees/ha
Pods per Tree: ${podsPerTree.toStringAsFixed(1)}
Adjusted Yield/ha: ${adjustedYieldPerHectare.toStringAsFixed(2)} kg
Estimated Volume: ${estimatedVolume.toStringAsFixed(2)} kg\nSaved Locally ✅''';
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
      appBar: AppBar(title: Text('Yield Estimator'), actions: [
        IconButton(
          icon: Icon(Icons.folder),
          onPressed: () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => SavedRecordsPage()));
          },
        )
      ]),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(children: [
            buildCard("ID Number",
              TextFormField(
                controller: _idNumberController,
                keyboardType: TextInputType.text,
                decoration: InputDecoration(hintText: 'Enter ID number'),
              ),
            ),
            buildCard("Officer Name",
              TextFormField(
                controller: _officerController,
                keyboardType: TextInputType.name,
                decoration: InputDecoration(hintText: 'Enter officer name'),
              ),
            ),
            buildCard("Farm Location",
              TextFormField(
                controller: _locationController,
                keyboardType: TextInputType.text,
                decoration: InputDecoration(hintText: 'Enter location'),
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
                  decoration: InputDecoration(
                      hintText: 'Select date'),
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
            buildCard("3. Number of productive trees sampled",
              TextFormField(
                controller: _sampledTreesController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(hintText: 'Enter sampled tree count'),
              ),
            ),
            buildCard("4. Certified farm area (hectares)",
              TextFormField(
                controller: _certifiedAreaController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(hintText: 'Enter area in hectares'),
              ),
            ),
            buildCard("5. Cocoa produced last year (kg)",
              TextFormField(
                controller: _lastYearProductionController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(hintText: "Enter previous year's production"),
              ),
            ),
            buildCard("6. Local Conditions (tick if applicable)",
              Column(
                children: _conditions.keys.map((key) => CheckboxListTile(
                  title: Text(key),
                  value: _conditions[key],
                  onChanged: (val) => setState(() => _conditions[key] = val ?? false),
                )).toList(),
              ),
            ),
            ElevatedButton(
              onPressed: _calculateYield,
              child: Text('Estimate Yield'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.brown,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            SizedBox(height: 20),
            if (_result.isNotEmpty)
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(_result,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              )
          ]),
        ),
      ),
    );
  }
}
class SavedRecordsPage extends StatefulWidget {
  @override
  _SavedRecordsPageState createState() => _SavedRecordsPageState();
}

class _SavedRecordsPageState extends State<SavedRecordsPage> {
  Box<dynamic> yieldBox = Hive.box(yieldBoxName);
  Set<int> selectedIndices = {};
  bool selectionMode = false;

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
      ['ID', 'Officer', 'Location', 'Date', 'Yield/Ha', 'Volume']
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
      ]);
    }

    final csv = const ListToCsvConverter().convert(rows);
    final dir = await getExternalStorageDirectory();
    final path = '${dir!.path}/yield_estimates.csv';
    final file = File(path);
    await file.writeAsString(csv);

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('CSV saved to $path'),
    ));
  }

  void shareSelected() async {
  List<List<dynamic>> rows = [
    ['ID', 'Officer', 'Location', 'Date', 'Yield/Ha', 'Volume']
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


  void editId(int index) {
    final record = Map<String, dynamic>.from(yieldBox.getAt(index));
    final controller = TextEditingController(text: record['idNumber'] ?? '');
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Edit ID'),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(hintText: 'Enter new ID'),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
            },
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              record['idNumber'] = controller.text.trim();
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
        title: Text('Saved Records'),
        actions: [
          if (selectionMode) ...[
            IconButton(
              icon: Icon(Icons.download),
              onPressed: exportCSV,
            ),
            IconButton(
              icon: Icon(Icons.share),
              onPressed: shareSelected,
            ),
            IconButton(
              icon: Icon(Icons.close),
              onPressed: clearSelection,
            ),
          ]
        ],
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
                    } else {
                      editId(index);
                    }
                  },
                  child: Card(
                    color: selected ? Colors.brown[100] : null,
                    child: ExpansionTile(
                      title: Text('ID: ${record['idNumber'] ?? ''}'),
                      subtitle: Text('Officer: ${record['officer'] ?? ''}'),
                      children: [
                        ListTile(title: Text('Location: ${record['location'] ?? ''}')),
                        ListTile(title: Text('Date: ${record['timestamp']?.substring(0, 10) ?? ''}')),
                        ListTile(title: Text('Yield/Ha: ${record['yieldPerHa'].toStringAsFixed(2)} kg')),
                        ListTile(title: Text('Volume: ${record['volume'].toStringAsFixed(2)} kg')),
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



