import 'package:flutter/material.dart';
import 'package:taxi/routes/routes.dart';
import 'package:taxi/themes/theme.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false, 
      title: 'Taxi App',
      theme: AppTheme.lightTheme,
      initialRoute: Routes.splash,
      onGenerateRoute: Routes.generateRoute,
      onUnknownRoute: (settings) => MaterialPageRoute(
        builder: (_) => Scaffold(
          body: Center(
            child: Text('Unknown route: ${settings.name}'),
          ),
        ),
      ),
    );
  }
}