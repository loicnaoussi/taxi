
import 'package:flutter/material.dart';
import 'package:taxi/screens/driver_home.dart';
import 'package:taxi/screens/passenger_home.dart';
import 'package:taxi/screens/role_selection_screen.dart';
import 'package:taxi/screens/splash_screen.dart';

class Routes {
  static const String splash = '/';
  static const String roleSelection = '/role_selection';
  static const String driverHome = '/driver_home';
  static const String passengerHome = '/passenger_home';
  static const String requestRide = '/request_ride';
  static const String rideHistory = '/ride_history';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => SplashScreen());
      case roleSelection:
        return MaterialPageRoute(builder: (_) => RoleSelectionScreen());
      case driverHome:
        return MaterialPageRoute(builder: (_) => DriverHomeScreen());
      case passengerHome:
        return MaterialPageRoute(builder: (_) => PassengerHomeScreen());
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('No route defined for ${settings.name}'),
            ),
          ),
        );
    }
  }
}
